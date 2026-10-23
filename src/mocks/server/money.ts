import Big from 'big.js'

// Wei precision, half-up rounding, never exponential notation.
Big.DP = 18
Big.RM = Big.roundHalfUp
Big.NE = -30
Big.PE = 40

export const eth = (value: string | number | Big) => new Big(value)

/** Canonical decimal string ("26.846", "0.016", "0"). */
export const toEth = (value: Big) => value.toString()

export const sumEth = (values: Big[]) =>
  values.reduce((acc, v) => acc.plus(v), new Big(0))
