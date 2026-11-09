/**
 * After a refused form, the focus on its first field in error (else on
 * nothing: the message above the form is read by its live region).
 */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
