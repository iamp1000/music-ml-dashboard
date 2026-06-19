import httpx
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

analyzer = SentimentIntensityAnalyzer()

async def get_lyrics_and_sentiment(track_name: str, artist_name: str):
    """
    Fetches lyrics from LRCLIB and returns a lyrical valence score between 0.0 and 1.0.
    Returns (lyrics_text, lyrical_valence). If not found, returns (None, None).
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                "https://lrclib.net/api/search",
                params={"track_name": track_name, "artist_name": artist_name}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    best_match = data[0]
                    lyrics = best_match.get("plainLyrics")
                    
                    if lyrics:
                        # VADER returns compound score between -1.0 and 1.0
                        sentiment_dict = analyzer.polarity_scores(lyrics)
                        compound = sentiment_dict['compound']
                        
                        # Map [-1.0, 1.0] to [0.0, 1.0] for valence
                        lyrical_valence = (compound + 1.0) / 2.0
                        return lyrics, lyrical_valence
    except Exception as e:
        print(f"Failed to fetch or analyze lyrics for {track_name}: {e}")
        
    return None, None
