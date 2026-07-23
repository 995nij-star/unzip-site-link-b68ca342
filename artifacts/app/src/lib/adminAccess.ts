/** Emails that can access the admin panel. */
export const ADMIN_EMAILS = ["aktershun38@gmail.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return ADMIN_EMAILS.includes(email ?? "");
}
