# Testing Guide

This document describes how to run the test suite for the Voice Agent Tester project.

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)

## Installation

Install the development dependencies which include pytest and related packages:

```bash
pip install -r requirements-dev.txt
```

Or install test dependencies directly:

```bash
pip install pytest pytest-asyncio pytest-cov
```

## Running Tests

### Run All Tests

```bash
pytest
```

Or with verbose output:

```bash
pytest -v
```

### Run a Specific Test File

```bash
pytest tests/test_metrics.py
pytest tests/test_scenarios.py
pytest tests/test_report_generator.py
```

### Run a Specific Test Class

```bash
pytest tests/test_metrics.py::TestCallMetrics
pytest tests/test_scenarios.py::TestRegularOrderScenario
```

### Run a Specific Test Function

```bash
pytest tests/test_metrics.py::TestCallMetrics::test_duration_seconds
pytest tests/test_audio_converter.py::TestAudioConverterMulaw::test_roundtrip_mulaw_pcm_mulaw
```

### Run Tests Matching a Pattern

```bash
# Run all tests with "latency" in the name
pytest -k "latency"

# Run all tests with "compliance" in the name
pytest -k "compliance"

# Run tests matching multiple patterns
pytest -k "latency or compliance"
```

## Test Coverage

### Generate Coverage Report

```bash
pytest --cov=src --cov-report=term-missing
```

### Generate HTML Coverage Report

```bash
pytest --cov=src --cov-report=html
```

This creates a `htmlcov/` directory. Open `htmlcov/index.html` in a browser to view the detailed coverage report.

### Generate Coverage with Specific Threshold

```bash
pytest --cov=src --cov-fail-under=80
```

This will fail the test run if coverage drops below 80%.

## Test Output Options

### Show Print Statements

```bash
pytest -s
```

### Show Local Variables in Tracebacks

```bash
pytest -l
```

### Stop on First Failure

```bash
pytest -x
```

### Stop After N Failures

```bash
pytest --maxfail=3
```

### Run Failed Tests First

```bash
pytest --ff
```

### Run Only Previously Failed Tests

```bash
pytest --lf
```

## Test Structure

```
tests/
├── __init__.py
├── conftest.py              # Shared fixtures
├── test_audio_converter.py  # Audio format conversion tests
├── test_config.py           # Configuration loading tests
├── test_metrics.py          # Metrics and analytics tests
├── test_report_generator.py # Report generation tests
├── test_scenarios.py        # Test scenario validation
└── test_twilio_handler.py   # Twilio integration tests
```

## Test Categories

| Test File | Description |
|-----------|-------------|
| `test_metrics.py` | Tests for `Speaker`, `TranscriptEntry`, `LatencyMeasurement`, `SystemPromptCompliance`, `ScenarioResult`, `CallMetrics`, and `MetricsAnalyzer` |
| `test_report_generator.py` | Tests for JSON/Markdown report generation, status determination, and data aggregation |
| `test_scenarios.py` | Tests for all 10 customer scenarios and base scenario functionality |
| `test_audio_converter.py` | Tests for mu-law/PCM16 conversion and resampling between Twilio and OpenAI formats |
| `test_config.py` | Tests for environment variable loading and configuration types |
| `test_twilio_handler.py` | Tests for `TwilioCallManager` and `TwilioMediaStreamHandler` |

## Writing New Tests

### Test File Naming

- Test files must start with `test_` (e.g., `test_new_feature.py`)
- Test classes must start with `Test` (e.g., `TestNewFeature`)
- Test functions must start with `test_` (e.g., `test_feature_works`)

### Using Fixtures

Shared fixtures are defined in `conftest.py`. Use them in your tests:

```python
def test_example(sample_call_metrics):
    assert sample_call_metrics.call_id == "test_call_123"
```

### Async Tests

For async functions, use the `@pytest.mark.asyncio` decorator:

```python
import pytest

@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result == expected_value
```

### Mocking External Services

Use `unittest.mock` to mock external dependencies:

```python
from unittest.mock import patch, Mock

def test_with_mock():
    with patch("src.twilio_handler.Client") as mock_client:
        mock_client.return_value.calls.create.return_value = Mock(sid="CA123")
        # Test code here
```

## Continuous Integration

To run tests in CI/CD pipelines, use:

```bash
pytest --tb=short --junitxml=test-results.xml
```

This generates a JUnit XML report that most CI systems can parse.

## Troubleshooting

### Tests Not Found

Ensure your test files and functions follow the naming conventions (`test_*.py`, `test_*`).

### Import Errors

Make sure you're running pytest from the project root directory:

```bash
cd /path/to/voice-agent-tester
pytest
```

### Async Test Issues

If async tests hang or fail unexpectedly, ensure `pytest-asyncio` is installed and the `asyncio_mode = auto` setting is in `pytest.ini`.

### Environment Variables

Some tests may behave differently based on your `.env` file. The test suite is designed to work with or without environment variables configured.
