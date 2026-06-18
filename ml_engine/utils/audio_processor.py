import torch
import torchaudio
import torchaudio.transforms as T

class AudioProcessor:
    def __init__(self, sample_rate=22050, n_fft=2048, hop_length=512, n_mels=128):
        self.sample_rate = sample_rate
        self.mel_spectrogram = T.MelSpectrogram(
            sample_rate=sample_rate,
            n_fft=n_fft,
            hop_length=hop_length,
            n_mels=n_mels,
            power=2.0
        )
        self.amplitude_to_db = T.AmplitudeToDB()

    def process_file(self, file_path: str) -> torch.Tensor:
        """
        Loads an audio file and converts it to a log-scaled Mel-spectrogram.
        Returns a tensor of shape [1, n_mels, time_steps]
        """
        waveform, sr = torchaudio.load(file_path)
        
        # Resample if necessary
        if sr != self.sample_rate:
            resampler = T.Resample(orig_freq=sr, new_freq=self.sample_rate)
            waveform = resampler(waveform)

        # Convert to mono by averaging channels if stereo
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        mel_spec = self.mel_spectrogram(waveform)
        log_mel_spec = self.amplitude_to_db(mel_spec)
        return log_mel_spec
