import pandas as pd
import numpy as np
from datetime import datetime, timezone
import math

class FeatureExtractor:
    """
    Extracts the 15-variable high-dimensional feature vector (X) for the Spotify ML engine.
    This strictly avoids multicollinearity by focusing on Ratios and Deltas.
    """

    @staticmethod
    def _calculate_micro_friction(target_track: dict) -> dict:
        """
        Bucket 1: The "Micro-Friction" Vector
        """
        # x_scrub_count: Estimated based on 20s telemetry (expected vs actual progress)
        # If expected progress was 20,000 but actual was 15,000, scrub_count += 1
        x_scrub_count = target_track.get("estimated_scrub_count", 0)
        
        # x_ms_to_skip: If skipped, at what ms? If not skipped, this can be 0 or total_duration.
        is_skipped = target_track.get("is_skipped", False)
        x_ms_to_skip = target_track.get("listened_time", target_track.get("duration_ms", 0)) if is_skipped else 0
        
        return {
            "x_scrub_count": int(x_scrub_count),
            "x_ms_to_skip": int(x_ms_to_skip)
        }

    @staticmethod
    def _calculate_queue_intent(target_track: dict, preceding_tracks: list) -> dict:
        """
        Bucket 2: The "Queue Intent" Vector
        """
        # x_source_type: Categorical encoding for Spotify context
        context_type = target_track.get("context_type", "unknown").lower()
        source_mapping = {"playlist": 1, "album": 2, "artist": 3, "search": 4}
        x_source_type = source_mapping.get(context_type, 0) # 0 for unknown
        
        # x_is_saved_track: Pulled from Spotify batch queue
        x_is_saved_track = 1 if target_track.get("is_saved", False) else 0
        
        # x_preceding_skips: Count tracks immediately prior that were skipped (< 30s play time)
        skip_count = 0
        for track in reversed(preceding_tracks):
            if track.get("listened_time", 0) < 30000: # Less than 30s is a definitive skip
                skip_count += 1
            else:
                break
                
        return {
            "x_source_type": x_source_type,
            "x_is_saved_track": x_is_saved_track,
            "x_preceding_skips": skip_count
        }

    @staticmethod
    def _calculate_sonic_shock(target_track: dict, preceding_tracks: list) -> dict:
        """
        Bucket 3: The "Sonic Shock" Vector (The Vibe Delta)
        Calculated against the rolling average of the last 4 songs.
        """
        track_features = target_track.get("audio_features", {})
        track_energy = track_features.get("energy", 0.5)
        track_valence = track_features.get("valence", 0.5)
        track_tempo = track_features.get("tempo", 120.0)
        
        # Get last 4 valid tracks
        last_4 = [t.get("audio_features", {}) for t in preceding_tracks[-4:] if t.get("audio_features")]
        
        if not last_4:
            # Baseline if it's the first track of a session
            return {"x_energy_delta": 0.0, "x_valence_delta": 0.0, "x_tempo_shock": 0.0}
            
        avg_energy = sum(f.get("energy", 0.5) for f in last_4) / len(last_4)
        avg_valence = sum(f.get("valence", 0.5) for f in last_4) / len(last_4)
        avg_tempo = sum(f.get("tempo", 120.0) for f in last_4) / len(last_4)
        
        x_energy_delta = track_energy - avg_energy
        x_valence_delta = track_valence - avg_valence
        
        # |Track BPM - Session Avg BPM| / Session Avg BPM
        x_tempo_shock = abs(track_tempo - avg_tempo) / avg_tempo if avg_tempo > 0 else 0.0
        
        return {
            "x_energy_delta": round(float(x_energy_delta), 4),
            "x_valence_delta": round(float(x_valence_delta), 4),
            "x_tempo_shock": round(float(x_tempo_shock), 4)
        }

    @staticmethod
    def _calculate_nostalgia(target_track: dict, session_tracks: list, historical_stats: dict) -> dict:
        """
        Bucket 4: The "Nostalgia & Saturation" Vector
        """
        # historical_stats contains aggregated lifetime data for the user
        track_id = target_track.get("track_id")
        artist_id = target_track.get("artist_id")
        
        track_history = historical_stats.get("tracks", {}).get(track_id, {})
        
        # x_days_since_last_play
        last_played_ts = track_history.get("last_played_at")
        if last_played_ts:
            now = datetime.now(timezone.utc).timestamp()
            x_days_since_last_play = int((now - last_played_ts) / 86400)
        else:
            x_days_since_last_play = 999 # First time listen
            
        # x_historical_skip_ratio
        total_plays = track_history.get("total_plays", 0)
        total_skips = track_history.get("total_skips", 0)
        x_historical_skip_ratio = (total_skips / total_plays) if total_plays > 0 else 0.0
        
        # x_artist_session_density
        artist_count = sum(1 for t in session_tracks if t.get("artist_id") == artist_id)
        total_session_tracks = len(session_tracks)
        x_artist_session_density = (artist_count / total_session_tracks) if total_session_tracks > 0 else 0.0
        
        return {
            "x_days_since_last_play": x_days_since_last_play,
            "x_historical_skip_ratio": round(float(x_historical_skip_ratio), 4),
            "x_artist_session_density": round(float(x_artist_session_density), 4)
        }

    @staticmethod
    def _calculate_environmental(target_track: dict, session_start_ts: float) -> dict:
        """
        Bucket 5: The "Environmental" Vector
        """
        track_ts = target_track.get("played_at", datetime.now(timezone.utc).timestamp())
        dt = datetime.fromtimestamp(track_ts, tz=timezone.utc)
        
        x_hour_of_day = dt.hour
        x_is_weekend = 1 if dt.weekday() >= 5 else 0
        x_day_fraction_progress = (dt.hour * 60 + dt.minute) / 1440.0
        
        x_session_length_so_far = int((track_ts - session_start_ts) / 60) if session_start_ts else 0
        
        return {
            "x_hour_of_day": x_hour_of_day,
            "x_is_weekend": x_is_weekend,
            "x_day_fraction_progress": round(float(x_day_fraction_progress), 4),
            "x_session_length_so_far": max(0, x_session_length_so_far)
        }

    @classmethod
    def extract_features(cls, target_track: dict, session_tracks: list, historical_stats: dict) -> dict:
        """
        Master method to generate the 15-variable feature matrix (X)
        """
        # Determine index of the target track in the session to get preceding tracks
        target_id = target_track.get("id", target_track.get("track_id"))
        
        preceding_tracks = []
        for t in session_tracks:
            if t.get("id", t.get("track_id")) == target_id:
                break
            preceding_tracks.append(t)
            
        session_start_ts = session_tracks[0].get("played_at") if session_tracks else target_track.get("played_at")

        # Extract all buckets
        features = {}
        features.update(cls._calculate_micro_friction(target_track))
        features.update(cls._calculate_queue_intent(target_track, preceding_tracks))
        features.update(cls._calculate_sonic_shock(target_track, preceding_tracks))
        features.update(cls._calculate_nostalgia(target_track, session_tracks, historical_stats))
        features.update(cls._calculate_environmental(target_track, session_start_ts))
        
        return features

    @classmethod
    def extract_target_variable(cls, target_track: dict, post_track_history: list) -> int:
        """
        Calculates the Composite Target Variable (Y).
        1 = High Engagement, 0 = Low Engagement
        """
        # 1. Did they save the track to Liked Songs?
        if target_track.get("is_saved", False):
            return 1
            
        # 2. Did they scrub backward to re-listen to a drop?
        if target_track.get("estimated_scrub_count", 0) > 0:
            return 1
            
        # 3. Did they let it play to completion *after* a long skipping spree?
        # A skipping spree is > 3 skips
        is_completed = target_track.get("completion_percentage", 0) > 0.85
        preceding_skips = cls._calculate_queue_intent(target_track, [])["x_preceding_skips"] # Simplified check
        if is_completed and target_track.get("preceding_skips", 0) >= 3:
            return 1
            
        # 4. Did they listen to it again within 7 days?
        track_id = target_track.get("track_id")
        for future_track in post_track_history:
            if future_track.get("track_id") == track_id:
                time_diff_days = (future_track.get("played_at", 0) - target_track.get("played_at", 0)) / 86400
                if 0 < time_diff_days <= 7:
                    return 1
                    
        return 0
