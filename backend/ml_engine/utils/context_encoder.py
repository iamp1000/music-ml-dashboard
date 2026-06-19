import math
import datetime

def encode_cyclical_time(hour: float):
    """
    Encodes an hour (0-24) into a cyclical vector [sin_time, cos_time].
    """
    radians = (hour / 24.0) * 2 * math.pi
    sin_time = math.sin(radians)
    cos_time = math.cos(radians)
    return [sin_time, cos_time]

def encode_datetime(dt: datetime.datetime):
    hour_float = dt.hour + (dt.minute / 60.0)
    sin_time, cos_time = encode_cyclical_time(hour_float)
    
    day_radians = (dt.weekday() / 7.0) * 2 * math.pi
    sin_day = math.sin(day_radians)
    cos_day = math.cos(day_radians)
    
    return [sin_time, cos_time, sin_day, cos_day]
