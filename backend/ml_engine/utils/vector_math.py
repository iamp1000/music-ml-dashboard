import math

class VectorMathEngine:
    """
    Translates the 15-variable feature matrix into a 4-Dimensional Behavioral Vector.
    W_vec = [Fixation, Immersion, Volatility, Vault]
    
    This operates as a deterministic mirror of user behavior, not a predictive black-box.
    """
    
    # Absolute cap to prevent K-Means clustering breakdown when users loop a song 300 times.
    MAX_MAGNITUDE = 10.0  

    @classmethod
    def calculate_fixation(cls, base_completion_ratio: float, repeat_count: int, scrub_count: int) -> float:
        """
        w_fixation: The "Consecutive Loop" Explosive.
        Starts with a base of 0.0 to 1.0 based on completion and scrubs.
        Explodes exponentially with consecutive loops.
        """
        # Base engagement: Did they finish it? Did they scrub back to re-listen?
        base = base_completion_ratio + (scrub_count * 0.2)
        base = min(1.0, base)
        
        # Explosion: Repeated loops back-to-back
        w_fixation = base + (repeat_count * 1.5)
        
        return min(cls.MAX_MAGNITUDE, w_fixation)

    @classmethod
    def calculate_immersion(cls, base_engagement: float, artist_plays_7d: int, total_plays_7d: int) -> float:
        """
        w_immersion: The "Artist Affinity" Multiplier.
        Tracks how deeply they sink into the vibe, multiplied by their obsession with the artist.
        """
        if total_plays_7d > 0:
            artist_ratio = artist_plays_7d / total_plays_7d
        else:
            artist_ratio = 0.0
            
        # AAI (Artist Affinity Index) Math
        aai = 1.0 + (artist_ratio * 3.0)
        
        w_immersion = base_engagement * aai
        return min(cls.MAX_MAGNITUDE, w_immersion)

    @classmethod
    def calculate_volatility(cls, skip_spree_count: int, ms_to_skip: int, duration_ms: int, tempo_shock: float) -> float:
        """
        w_volatility: The Erratic Friction Score.
        High volatility means searching, rapid-fire skipping, and actively interacting with the glass.
        """
        # Base volatility from skip speed. Quicker skip = higher volatility
        if ms_to_skip > 0 and duration_ms > 0 and ms_to_skip < duration_ms:
            skip_ratio = 1.0 - (ms_to_skip / duration_ms) 
        else:
            skip_ratio = 0.0
            
        # Add the sonic shock (did the tempo wildly jump compared to the session average?)
        volatility = skip_ratio + tempo_shock
        
        # Explosion: The Skip Spree
        volatility = volatility * (1.0 + (skip_spree_count * 0.5))
        
        return min(cls.MAX_MAGNITUDE, volatility)

    @classmethod
    def calculate_vault(cls, days_since_last_play: int, repeat_count: int) -> float:
        """
        w_vault: The "Era Obsession" Scaling.
        Tracks resurrections of old tracks and nostalgia.
        """
        if days_since_last_play >= 999: 
            # 999 denotes a brand new discovery, not a vault resurrection
            return 0.0
            
        # Mathematical curve: (1 - e^(-0.01 * days))
        resurrection_score = 1.0 - math.exp(-0.01 * days_since_last_play)
        
        # Explosion: Resurrecting an old track AND immediately looping it
        w_vault = resurrection_score * (1.0 + repeat_count)
        
        return min(cls.MAX_MAGNITUDE, w_vault)

    @classmethod
    def generate_vector(cls, features: dict, historical_context: dict) -> list:
        """
        Ingests the 15-variable feature matrix and user history to output the W_vec list.
        Returns: [w_fixation, w_immersion, w_volatility, w_vault]
        """
        # Pull required variables from the FeatureExtractor matrix
        scrub_count = features.get("x_scrub_count", 0)
        ms_to_skip = features.get("x_ms_to_skip", 0)
        preceding_skips = features.get("x_preceding_skips", 0)
        tempo_shock = features.get("x_tempo_shock", 0.0)
        days_since_last_play = features.get("x_days_since_last_play", 0)
        
        # History Context mappings
        repeat_count = historical_context.get("session_repeat_count", 0)
        base_completion = historical_context.get("base_completion_ratio", 0.0)
        artist_plays_7d = historical_context.get("artist_plays_7d", 0)
        total_plays_7d = historical_context.get("total_plays_7d", 0)
        duration_ms = historical_context.get("duration_ms", 1)
        
        fixation = cls.calculate_fixation(base_completion, repeat_count, scrub_count)
        immersion = cls.calculate_immersion(base_completion, artist_plays_7d, total_plays_7d)
        volatility = cls.calculate_volatility(preceding_skips, ms_to_skip, duration_ms, tempo_shock)
        vault = cls.calculate_vault(days_since_last_play, repeat_count)
        
        # Return as a clean, structured float array for clustering algorithms
        return [
            round(fixation, 3),
            round(immersion, 3),
            round(volatility, 3),
            round(vault, 3)
        ]
