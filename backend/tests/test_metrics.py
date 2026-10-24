from app import metrics


def test_percentile():
    assert metrics.percentile([1, 2, 3, 4, 5], 50) == 3
    assert metrics.percentile([1, 2, 3, 4, 5], 90) == 4.6
    assert metrics.percentile([], 50) is None


def test_summary_hand_checked():
    s = metrics.summary([100, -100, 300, 100], [1000, 1000, 1000, 1000])
    assert s["n"] == 4
    assert s["mae"] == 150
    assert s["bias"] == 100
    assert round(s["rmse"], 6) == round((120000 / 4) ** 0.5, 6)
    assert s["nmae"] == 0.15
    assert s["over_share"] == 0.75
    assert s["max_abs"] == 300
    assert metrics.summary([], []) == {"n": 0}


def test_histogram_clamps_outliers():
    h = metrics.histogram([-20000, 0, 250, 20000], width=500, lo=-1000, hi=1000)
    assert [b["count"] for b in h] == [1, 0, 2, 1]


def test_band_uses_error_sign_convention():
    # Errors all +1000 (over-forecast) -> plausible actual sits 1000 below the forecast.
    assert metrics.band(5000, [1000] * 10) == {"low": 4000, "high": 4000}
    assert metrics.band(5000, []) is None
