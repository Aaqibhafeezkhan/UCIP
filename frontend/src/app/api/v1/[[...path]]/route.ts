import { errorResponse, optionsResponse } from "../_lib";

function notFoundResponse() {
  return errorResponse(404, "API endpoint not found.");
}

export function GET() {
  return notFoundResponse();
}

export function POST() {
  return notFoundResponse();
}

export function PUT() {
  return notFoundResponse();
}

export function PATCH() {
  return notFoundResponse();
}

export function DELETE() {
  return notFoundResponse();
}

export function OPTIONS() {
  return optionsResponse();
}
