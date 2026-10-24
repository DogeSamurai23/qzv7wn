"""Pure error metrics. Errors are forecast - actual in MW (positive = over-forecast)."""
import math


def percentile(xs, p):
    """Linear-interpolated percentile, p in [0, 100]. Empty -> None."""
    if not xs:
        return None
    s = sorted(xs)
    k = (len(s) - 1) * p / 100
    lo, hi = math.floor(k), math.ceil(k)
    return s[lo] + (s[hi] - s[lo]) * (k - lo)


def summary(errors, actuals):
    """Headline accuracy stats for a list of errors and the matching actuals."""
    n = len(errors)
    if n == 0:
        return {"n": 0}
    abs_err = [abs(e) for e in errors]
    mae = sum(abs_err) / n
    mean_actual = sum(actuals) / n
    return {
        "n": n,
        "mae": mae,
        "rmse": math.sqrt(sum(e * e for e in errors) / n),
        "bias": sum(errors) / n,
        "nmae": mae / mean_actual if mean_actual else None,
        "p50_abs": percentile(abs_err, 50),
        "p90_abs": percentile(abs_err, 90),
        "p99_abs": percentile(abs_err, 99),
        "max_abs": max(abs_err),
        "over_share": sum(e > 0 for e in errors) / n,
        "mean_actual": mean_actual,
    }


def histogram(errors, width=500, lo=-8000, hi=8000):
    """Counts of errors in fixed-width bins [lo, hi); clamps outliers into the end bins."""
    bins = [{"from": b, "to": b + width, "count": 0} for b in range(lo, hi, width)]
    for e in errors:
        i = min(max(int((e - lo) // width), 0), len(bins) - 1)
        bins[i]["count"] += 1
    return bins


def band(forecast_mw, history_errors, lo_p=10, hi_p=90):
    """Plausible actual range given past errors: actual = forecast - error."""
    if not history_errors:
        return None
    return {
        "low": forecast_mw - percentile(history_errors, hi_p),
        "high": forecast_mw - percentile(history_errors, lo_p),
    }
