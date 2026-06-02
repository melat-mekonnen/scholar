export const MIN_PASSWORD_LENGTH = 8

export type PasswordStrength = "weak" | "fair" | "strong"

export type PasswordCheck = {
  minLength: boolean
  hasNumber: boolean
  hasSymbol: boolean
  hasUpper: boolean
  strength: PasswordStrength
  errors: string[]
}

export function checkPassword(password: string): PasswordCheck {
  const minLength = password.length >= MIN_PASSWORD_LENGTH
  const hasNumber = /\d/.test(password)
  const hasSymbol = /[^A-Za-z0-9]/.test(password)
  const hasUpper = /[A-Z]/.test(password)

  const errors: string[] = []
  if (!minLength) errors.push(`At least ${MIN_PASSWORD_LENGTH} characters`)
  if (!hasNumber) errors.push("At least one number")
  if (!hasSymbol) errors.push("At least one symbol")

  let strength: PasswordStrength = "weak"
  if (minLength && hasNumber && hasSymbol) {
    strength = password.length >= 12 && hasUpper ? "strong" : "fair"
  }

  return { minLength, hasNumber, hasSymbol, hasUpper, strength, errors }
}

export function formatPasswordErrors(errors: string[]): string {
  return errors.join(". ")
}
