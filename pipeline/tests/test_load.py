"""Supabase loading logic in stage 07 (issue #203), against a fake client.

No database and no supabase package: the stage imports both lazily, and the
fake below records what the loader asked for. What matters is the order of
operations and what survives a failure, since those are what the issue was
about: stale rows that never got deleted, an empty table after a failed insert,
and a failed write that still exited 0.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

pytest.importorskip("geopandas", reason="geopandas is not installed in CI")

PIPELINE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PIPELINE_DIR))


@pytest.fixture(scope="module")
def load():
    spec = importlib.util.spec_from_file_location("stage07_load", PIPELINE_DIR / "07_load.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class Result:
    def __init__(self, data=None):
        self.data = data


class FakeQuery:
    def __init__(self, db, table):
        self.db, self.table, self.op, self.payload, self.filters = db, table, None, None, []
        self.rng = None

    def select(self, _cols="*"):
        self.op = "select"
        return self

    def range(self, start, end):
        self.rng = (start, end)
        return self

    def insert(self, rows):
        self.op, self.payload = "insert", rows
        return self

    def delete(self):
        self.op = "delete"
        return self

    def lte(self, col, value):
        self.filters.append(("lte", col, value))
        return self

    def in_(self, col, values):
        self.filters.append(("in", col, list(values)))
        return self

    def execute(self):
        self.db.log.append((self.op, self.table, self.filters, self.payload))
        if self.table in self.db.fail_on.get(self.op, ()):
            raise RuntimeError(f"{self.op} {self.table} failed")
        rows = self.db.tables.setdefault(self.table, [])
        if self.op == "select":
            lo, hi = self.rng or (0, len(rows))
            return Result([dict(r) for r in rows[lo:hi + 1]])
        if self.op == "insert":
            nxt = max((r.get("id", 0) for r in rows), default=0)
            for i, r in enumerate(self.payload, start=1):
                rows.append({**r, "id": nxt + i})
        if self.op == "delete":
            def hit(r):
                for kind, col, val in self.filters:
                    if kind == "lte" and not r[col] <= val:
                        return False
                    if kind == "in" and str(r[col]) not in [str(v) for v in val]:
                        return False
                return True
            self.db.tables[self.table] = [r for r in rows if not hit(r)]
        return Result()


class FakeRpc:
    def __init__(self, db, name, params):
        self.db, self.name, self.params = db, name, params

    def execute(self):
        self.db.log.append(("rpc", self.name, [], self.params))
        if self.db.rpc_error:
            raise self.db.rpc_error
        # The real function is one transaction: all or nothing.
        if "nbs_recommendations" in self.db.fail_on.get("insert", ()):
            raise RuntimeError("insert failed inside the transaction, rolled back")
        self.db.tables["nbs_recommendations"] = [
            {**r, "id": i} for i, r in enumerate(self.params["rows"], start=1)
        ]


class FakeClient:
    def __init__(self, tables=None, fail_on=None, rpc_error=None):
        self.tables = tables or {}
        self.fail_on = fail_on or {}
        self.rpc_error = rpc_error
        self.log = []

    def table(self, name):
        return FakeQuery(self, name)

    def rpc(self, name, params):
        return FakeRpc(self, name, params)


def keys(client, table, key):
    return sorted(r[key] for r in client.tables.get(table, []))


# --- stale rows ---

def test_prune_removes_rows_absent_from_the_new_set(load):
    client = FakeClient({"grid_cells": [{"grid_id": f"cell_{i:04d}"} for i in range(8)]})
    assert load.prune_stale(client, "grid_cells", "grid_id", [f"cell_{i:04d}" for i in range(5)])
    assert keys(client, "grid_cells", "grid_id") == [f"cell_{i:04d}" for i in range(5)]


def test_prune_pages_through_a_table_larger_than_one_page(load):
    client = FakeClient({"grid_cells": [{"grid_id": f"c{i:03d}"} for i in range(25)]})
    load.prune_stale(client, "grid_cells", "grid_id", ["c000", "c001"], page=10, chunk=4)
    assert keys(client, "grid_cells", "grid_id") == ["c000", "c001"]


def test_prune_never_empties_a_table_on_an_empty_key_set(load):
    client = FakeClient({"wards": [{"ward_id": "A"}, {"ward_id": "B"}]})
    assert load.prune_stale(client, "wards", "ward_id", []) is False
    assert keys(client, "wards", "ward_id") == ["A", "B"]


# --- the recommendations replace ---

RECS = [{"ward_id": "A", "intervention": "x", "rationale": "r", "citation": "c", "priority": 1}]
OLD = [{"id": 1, "ward_id": "A", "intervention": "old"}, {"id": 2, "ward_id": "B", "intervention": "old"}]


def test_replace_goes_through_one_rpc_call(load):
    client = FakeClient({"nbs_recommendations": [dict(r) for r in OLD]})
    assert load.replace_table(client, "nbs_recommendations", RECS)
    assert [op for op, *_ in client.log] == ["rpc"]
    assert client.tables["nbs_recommendations"][0]["intervention"] == "x"


def test_a_failed_replace_leaves_the_previous_rows_in_place(load):
    client = FakeClient(
        {"nbs_recommendations": [dict(r) for r in OLD]},
        fail_on={"insert": ("nbs_recommendations",)},
    )
    assert load.replace_table(client, "nbs_recommendations", RECS) is False
    assert [r["id"] for r in client.tables["nbs_recommendations"]] == [1, 2]


def test_the_fallback_inserts_before_it_deletes(load):
    """Migration 0009 not applied yet: same guarantee, different mechanism."""
    missing = RuntimeError("PGRST202 Could not find the function replace_nbs_recommendations")
    client = FakeClient({"nbs_recommendations": [dict(r) for r in OLD]}, rpc_error=missing)
    assert load.replace_table(client, "nbs_recommendations", RECS)
    ops = [op for op, *_ in client.log if op != "rpc"]
    assert ops.index("insert") < ops.index("delete")
    assert [r["intervention"] for r in client.tables["nbs_recommendations"]] == ["x"]


def test_the_fallback_keeps_old_rows_when_the_insert_fails(load):
    missing = RuntimeError("PGRST202 Could not find the function replace_nbs_recommendations")
    client = FakeClient(
        {"nbs_recommendations": [dict(r) for r in OLD]},
        fail_on={"insert": ("nbs_recommendations",)},
        rpc_error=missing,
    )
    assert load.replace_table(client, "nbs_recommendations", RECS) is False
    assert [r["id"] for r in client.tables["nbs_recommendations"]] == [1, 2]


# --- missing values ---

def test_optional_float_maps_missing_values_to_none(load):
    assert load.optional_float(None) is None
    assert load.optional_float(float("nan")) is None
    assert load.optional_float(12.5) == 12.5
    assert load.optional_float(0) == 0.0


def test_the_migration_defines_the_function_the_loader_calls():
    sql = (PIPELINE_DIR.parent / "supabase" / "migrations" / "0009_replace_nbs_recommendations.sql").read_text()
    assert "replace_nbs_recommendations(rows jsonb)" in sql
    assert "grant execute" in sql and "service_role" in sql


# --- exit code ---

@pytest.fixture
def staged(load, monkeypatch, tmp_path):
    """Point stage 07 at a copy of the committed outputs, so main() can run
    without rewriting the repo's own snapshots."""
    data = PIPELINE_DIR.parent / "data"
    import shutil

    for name in ("cells_nbs.geojson", "wards_hvi.geojson", "nbs_recommendations.json"):
        shutil.copy(data / name, tmp_path / name)
    monkeypatch.setattr(load, "DATA_DIR", tmp_path)
    monkeypatch.setattr(load, "CELLS_PATH", tmp_path / "cells_nbs.geojson")
    monkeypatch.setattr(load, "WARDS_PATH", tmp_path / "wards_hvi.geojson")
    monkeypatch.setattr(load, "REC_PATH", tmp_path / "nbs_recommendations.json")
    monkeypatch.setattr(load, "SNAP_CELLS", tmp_path / "snapshot_cells.geojson")
    monkeypatch.setattr(load, "SNAP_WARDS", tmp_path / "snapshot_wards.geojson")
    monkeypatch.setattr(load, "SNAP_RECS", tmp_path / "snapshot_nbs_recommendations.json")
    return tmp_path


def test_a_failed_database_write_exits_2_when_credentials_are_set(load, staged, monkeypatch):
    client = FakeClient()
    client.table = lambda name: (_ for _ in ()).throw(RuntimeError("database unreachable"))
    monkeypatch.setattr(load, "get_client", lambda: client)
    # wards_has_dominance_columns probes the database and swallows the error.
    assert load.main() == 2
    # The snapshots are written regardless; that is the hard requirement.
    assert (staged / "snapshot_cells.geojson").exists()


def test_no_credentials_is_not_a_failure(load, staged, monkeypatch):
    monkeypatch.setattr(load, "get_client", lambda: None)
    assert load.main() == 0


def test_prune_compares_ids_as_strings(load):
    """A numeric id on one side and text on the other must not read as all stale."""
    client = FakeClient({"grid_cells": [{"grid_id": 1}, {"grid_id": 2}, {"grid_id": 3}]})
    assert load.prune_stale(client, "grid_cells", "grid_id", ["1", "2"])
    assert sorted(str(r["grid_id"]) for r in client.tables["grid_cells"]) == ["1", "2"]
    assert load.prune_stale(client, "grid_cells", "grid_id", [1, 2])
    assert len(client.tables["grid_cells"]) == 2
