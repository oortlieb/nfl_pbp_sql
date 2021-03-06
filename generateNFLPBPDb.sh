#!/bin/bash

# curl "http://nflsavant.com/pbp_data.php?year=2021" -o pbp_2021.csv

rm pbp_2021.sqlite

sqlite3 pbp_2021.sqlite << 'END_SQL'
.mode csv

.import pbp_2021.csv plays_text

.schema plays_text

create table plays (
    game_id INT,
    game_date TEXT,
    quarter INT,
    minute INT,
    second INT,
    offense_team TEXT,
    defense_team TEXT,
    down INT,
    to_go INT,
    yard_line INT,
    series_first_down BOOLEAN,
    next_score BOOLEAN,
    description TEXT,
    team_win BOOLEAN,
    season_year INT,
    yards INT,
    formation TEXT,
    play_type TEXT,
    is_rush BOOLEAN,
    is_pass BOOLEAN,
    is_incomplete BOOLEAN,
    is_touchdown BOOLEAN,
    pass_type TEXT,
    is_sack BOOLEAN,
    is_challenge BOOLEAN,
    is_challenge_reversed BOOLEAN,
    challenger TEXT,
    is_measurement BOOLEAN,
    is_interception BOOLEAN,
    is_fumble BOOLEAN,
    is_penalty BOOLEAN,
    is_two_point_conversion BOOLEAN,
    is_two_point_conversion_successful BOOLEAN,
    rush_direction TEXT,
    yard_line_fixed INT,
    yard_line_direction TEXT,
    is_penalty_accepted BOOLEAN,
    penalty_team TEXT,
    is_no_play BOOLEAN,
    penalty_type TEXT,
    penalty_yards INT
);

insert into plays(
    game_id,
    game_date,
    quarter,
    minute,
    second,
    offense_team,
    defense_team,
    down,
    to_go,
    yard_line,
    series_first_down,
    next_score,
    description,
    team_win,
    season_year,
    yards,
    formation,
    play_type,
    is_rush,
    is_pass,
    is_incomplete,
    is_touchdown,
    pass_type,
    is_sack,
    is_challenge,
    is_challenge_reversed,
    challenger,
    is_measurement,
    is_interception,
    is_fumble,
    is_penalty,
    is_two_point_conversion,
    is_two_point_conversion_successful,
    rush_direction,
    yard_line_fixed,
    yard_line_direction,
    is_penalty_accepted,
    penalty_team,
    is_no_play,
    penalty_type,
    penalty_yards
) 
select 
    "GameId", 
    "GameDate", 
    "Quarter", 
    "Minute", 
    "Second", 
    "OffenseTeam",
    "DefenseTeam", 
    "Down", 
    "ToGo", 
    "YardLine",
    "SeriesFirstDown",
    "NextScore",
    "Description",
    "TeamWin",
    "SeasonYear",
    "Yards",
    "Formation",
    "PlayType",
    "IsRush",
    "IsPass",
    "IsIncomplete",
    "IsTouchdown",
    "PassType",
    "IsSack",
    "IsChallenge",
    "IsChallengeReversed",
    "Challenger",
    "IsMeasurement",
    "IsInterception",
    "IsFumble",
    "IsPenalty",
    "IsTwoPointConversion",
    "IsTwoPointConversionSuccessful",
    "RushDirection",
    "YardLineFixed",
    "YardLineDirection",
    "IsPenaltyAccepted",
    "PenaltyTeam",
    "IsNoPlay",
    "PenaltyType",
    "PenaltyYards" 
from plays_text;

DROP TABLE plays_text;

END_SQL
