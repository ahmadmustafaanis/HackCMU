import type { Student } from "shared-types";

/** Onboarding's first step requires picking at least one interest before
 * continuing, so a non-empty `interests` list is a reliable signal that this
 * student has been through the wizard before — used to send a RETURNING
 * user straight to Home on sign-in instead of back through onboarding. */
export function hasCompletedOnboarding(student: Student): boolean {
  return student.interests.length > 0;
}
