-- Function to determine game weather based on server time
-- Returns JSON with 'weather' and 'is_day'

CREATE OR REPLACE FUNCTION get_game_weather()
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
    current_hour INT;
    weather_type TEXT;
    is_day BOOLEAN;
    random_val FLOAT;
BEGIN
    -- Get current hour in UTC (or user specific timezone if we had it, but using server time for now)
    -- Assuming server is UTC, we might want to adjust for a "game time" or specific region.
    -- Let's stick effectively to UTC for consistency across players for now, or just server local.
    current_hour := EXTRACT(HOUR FROM NOW());

    -- Define Day as 6 AM to 7 PM (06:00 to 19:00)
    IF current_hour >= 6 AND current_hour < 19 THEN
        is_day := TRUE;
        weather_type := 'sunny';
    ELSE
        is_day := FALSE;
        -- Night time: Rain or Fog
        -- 70% chance of Rain, 30% Fog
        random_val := random();
        IF random_val < 0.7 THEN
            weather_type := 'rain';
        ELSE
            weather_type := 'fog';
        END IF;
    END IF;

    RETURN json_build_object(
        'weather', weather_type,
        'is_day', is_day,
        'server_time', NOW()
    );
END;
$$;
