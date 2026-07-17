import type { Response } from "express";

type ValidationErrorConstructor = abstract new (...args: never[]) => Error;

export function sendServiceError(
  res: Response,
  error: unknown,
  validationError: ValidationErrorConstructor,
  validationStatus: number,
  fallbackMessage: string
) {
  if (error instanceof validationError) {
    res.status(validationStatus).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: fallbackMessage });
}

export function parseLocalDateParam(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parsedDate = new Date(`${value}T12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parsedDate.getTime())
    ? parsedDate
    : null;
}
