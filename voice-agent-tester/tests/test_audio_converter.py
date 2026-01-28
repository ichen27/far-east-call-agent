"""
Tests for the audio converter utilities.
"""

import pytest
import struct

from src.twilio_handler import AudioConverter


class TestAudioConverterMulaw:
    """Tests for mu-law conversion."""

    def test_mulaw_to_pcm16_returns_bytes(self):
        # Sample mu-law encoded data (silence = 0xFF in mu-law)
        mulaw_data = bytes([0xFF] * 100)

        result = AudioConverter.mulaw_to_pcm16(mulaw_data)

        print(f"\n  [AUDIO] mulaw_to_pcm16: input={len(mulaw_data)} bytes, output={len(result)} bytes, type={type(result).__name__}")
        assert isinstance(result, bytes)

    def test_mulaw_to_pcm16_length(self):
        # mu-law is 8-bit, PCM16 is 16-bit
        # So output should be 2x input length
        mulaw_data = bytes([0xFF] * 100)

        result = AudioConverter.mulaw_to_pcm16(mulaw_data)

        print(f"\n  [AUDIO] mulaw(8-bit) -> pcm16(16-bit): {len(mulaw_data)} bytes -> {len(result)} bytes (expected: 200)")
        assert len(result) == 200  # 100 samples * 2 bytes per sample

    def test_pcm16_to_mulaw_returns_bytes(self):
        # Sample PCM16 data (100 samples of silence)
        pcm_data = bytes([0x00] * 200)

        result = AudioConverter.pcm16_to_mulaw(pcm_data)

        assert isinstance(result, bytes)

    def test_pcm16_to_mulaw_length(self):
        # PCM16 is 16-bit, mu-law is 8-bit
        # So output should be 0.5x input length
        pcm_data = bytes([0x00] * 200)

        result = AudioConverter.pcm16_to_mulaw(pcm_data)

        assert len(result) == 100  # 200 bytes / 2 = 100 samples

    def test_roundtrip_mulaw_pcm_mulaw(self):
        # Create some mu-law data
        original = bytes([0x7F, 0x80, 0xFF, 0x00] * 25)

        # Convert to PCM16 and back
        pcm = AudioConverter.mulaw_to_pcm16(original)
        result = AudioConverter.pcm16_to_mulaw(pcm)

        # Should get similar data back (may not be exact due to quantization)
        assert len(result) == len(original)


class TestAudioConverterResample:
    """Tests for resampling."""

    def test_resample_same_rate(self):
        data = bytes([0x00, 0x01] * 100)

        result = AudioConverter.resample(data, 8000, 8000)

        assert result == data

    def test_resample_upsample(self):
        # 8kHz to 24kHz should triple the number of samples
        # 100 samples at 8kHz = 200 bytes
        data = bytes([0x00, 0x01] * 100)

        result = AudioConverter.resample(data, 8000, 24000)

        # Should be approximately 3x (may vary slightly due to resampling algorithm)
        assert len(result) > len(data) * 2

    def test_resample_downsample(self):
        # 24kHz to 8kHz should reduce by factor of 3
        # 300 samples at 24kHz = 600 bytes
        data = bytes([0x00, 0x01] * 300)

        result = AudioConverter.resample(data, 24000, 8000)

        # Should be approximately 1/3
        assert len(result) < len(data)


class TestAudioConverterTwilioOpenAI:
    """Tests for Twilio <-> OpenAI format conversion."""

    def test_twilio_to_openai_returns_bytes(self):
        # mu-law 8kHz data
        mulaw_8khz = bytes([0xFF] * 80)  # 10ms of audio at 8kHz

        result = AudioConverter.twilio_to_openai(mulaw_8khz)

        assert isinstance(result, bytes)

    def test_twilio_to_openai_upsamples(self):
        # Input: 8kHz mu-law (8-bit)
        # Output: 24kHz PCM16 (16-bit)
        # Rate: 3x, sample width: 2x = 6x total
        mulaw_8khz = bytes([0xFF] * 80)

        result = AudioConverter.twilio_to_openai(mulaw_8khz)

        ratio = len(result) / len(mulaw_8khz)
        print(f"\n  [AUDIO] twilio->openai: {len(mulaw_8khz)} bytes -> {len(result)} bytes (ratio: {ratio:.1f}x)")
        # Should be approximately 6x larger
        assert len(result) > len(mulaw_8khz) * 4

    def test_openai_to_twilio_returns_bytes(self):
        # PCM16 24kHz data
        pcm_24khz = bytes([0x00] * 480)  # 10ms of audio at 24kHz

        result = AudioConverter.openai_to_twilio(pcm_24khz)

        print(f"\n  [AUDIO] openai->twilio: {len(pcm_24khz)} bytes -> {len(result)} bytes")
        assert isinstance(result, bytes)

    def test_openai_to_twilio_downsamples(self):
        # Input: 24kHz PCM16 (16-bit)
        # Output: 8kHz mu-law (8-bit)
        # Rate: 1/3, sample width: 1/2 = 1/6 total
        pcm_24khz = bytes([0x00] * 480)

        result = AudioConverter.openai_to_twilio(pcm_24khz)

        ratio = len(result) / len(pcm_24khz)
        print(f"\n  [AUDIO] openai->twilio: {len(pcm_24khz)} bytes -> {len(result)} bytes (ratio: {ratio:.2f}x)")
        # Should be approximately 1/6 size
        assert len(result) < len(pcm_24khz) / 4

    def test_roundtrip_twilio_openai_twilio(self):
        # Create some mu-law data (10ms at 8kHz = 80 samples)
        original = bytes([0x7F] * 80)

        # Convert to OpenAI format and back
        openai_format = AudioConverter.twilio_to_openai(original)
        result = AudioConverter.openai_to_twilio(openai_format)

        # Should get back same number of samples
        assert len(result) == len(original)

    def test_realistic_audio_conversion(self):
        """Test with more realistic audio data patterns."""
        # Create a simple sine-wave-like pattern in mu-law
        # (alternating values to simulate audio)
        pattern = []
        for i in range(160):  # 20ms at 8kHz
            value = 0x7F + (i % 32) - 16  # Oscillate around 0x7F
            value = max(0, min(255, value))
            pattern.append(value)
        mulaw_data = bytes(pattern)

        # Convert through the pipeline
        pcm_24k = AudioConverter.twilio_to_openai(mulaw_data)
        mulaw_back = AudioConverter.openai_to_twilio(pcm_24k)

        # Should preserve length
        assert len(mulaw_back) == len(mulaw_data)

        # Should be valid mu-law data (all bytes in valid range)
        assert all(0 <= b <= 255 for b in mulaw_back)


class TestAudioConverterEdgeCases:
    """Edge case tests for audio converter."""

    def test_empty_input_mulaw_to_pcm(self):
        result = AudioConverter.mulaw_to_pcm16(b"")
        assert result == b""

    def test_empty_input_pcm_to_mulaw(self):
        result = AudioConverter.pcm16_to_mulaw(b"")
        assert result == b""

    def test_empty_input_resample(self):
        result = AudioConverter.resample(b"", 8000, 24000)
        assert result == b""

    def test_single_sample_conversion(self):
        # Single mu-law sample
        mulaw = bytes([0x7F])

        pcm = AudioConverter.mulaw_to_pcm16(mulaw)

        assert len(pcm) == 2  # One 16-bit sample

    def test_large_audio_chunk(self):
        """Test with a larger chunk of audio data."""
        # 1 second at 8kHz = 8000 samples
        mulaw_data = bytes([0x7F] * 8000)

        pcm_24k = AudioConverter.twilio_to_openai(mulaw_data)
        mulaw_back = AudioConverter.openai_to_twilio(pcm_24k)

        # Should handle without error
        assert len(mulaw_back) == 8000
