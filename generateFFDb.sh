#!/bin/bash

# curl "http://nflsavant.com/pbp_data.php?year=2021" -o pbp_2021.csv

DATA_PATH="../NFL-Data/NFL-data-Players/2021"
DB_NAME=ff_2021.sqlite

rm $DB_NAME

# Create the players table
sqlite3 $DB_NAME << END_SQL
create table player_games(
    player_name TEXT,
    player_id INT,
    pos TEXT,
    week INT NOT NULL,
    team TEXT,
    player_opponent TEXT,
    at_home BOOLEAN,
    passing_yds INT DEFAULT 0 NOT NULL,
    passing_int INT DEFAULT 0 NOT NULL,
    passing_td INT DEFAULT 0 NOT NULL,
    rushing_passing_yds INT DEFAULT 0 NOT NULL,
    receiving_rec INT DEFAULT 0 NOT NULL,
    receiving_yds INT DEFAULT 0 NOT NULL,
    receiving_td INT DEFAULT 0 NOT NULL,
    ret_td INT DEFAULT 0 NOT NULL,
    fum_td INT DEFAULT 0 NOT NULL,
    two_pt INT DEFAULT 0 NOT NULL,
    fum INT DEFAULT 0 NOT NULL,
    fan_pts_against_pts INT DEFAULT 0 NOT NULL,
    touch_carries INT DEFAULT 0 NOT NULL,
    touch_receptions INT DEFAULT 0 NOT NULL,
    touches INT DEFAULT 0 NOT NULL,
    targets_receptions INT DEFAULT 0 NOT NULL,
    targets INT DEFAULT 0 NOT NULL,
    reception_percentage INT DEFAULT 0 NOT NULL,
    rz_target INT DEFAULT 0 NOT NULL,
    rz_touch INT DEFAULT 0 NOT NULL,
    rz_g2g INT DEFAULT 0 NOT NULL,
    rank INT DEFAULT 0 NOT NULL,
    total_points FLOAT DEFAULT 0 NOT NULL
);

END_SQL

for week in `ls -d $DATA_PATH/*/`
do
    weekNumberString=${week: -3}
    weekNumber=${weekNumberString:1:-1}

    for p in "QB" "RB" "WR" "TE"
    do
        echo "${week}${p}.csv"

        sqlite3 $DB_NAME << END_SQL
.mode csv

.import "${week}/${p}.csv" temp

insert into player_games(
    player_name,
    player_id,
    pos,
    team,
    player_opponent,
    passing_yds,
    passing_int,
    passing_td,
    rushing_passing_yds,
    receiving_rec,
    receiving_yds,
    receiving_td ,
    ret_td,
    fum_td,
    two_pt,
    fum,
    fan_pts_against_pts,
    touch_carries,
    touch_receptions,
    touches,
    targets_receptions,
    targets,
    reception_percentage,
    rz_target,
    rz_touch,
    rz_g2g,
    rank,
    total_points,
    week,
    at_home
)
select
    "PlayerName",
    "PlayerId",
    "Pos",
    "Team",
    trim("PlayerOpponent", '@'),
    "PassingYDS",
    "PassingInt",
    "PassingTD",
    "RushingPassingYDS",
    "ReceivingRec",
    "ReceivingYDS",
    "ReceivingTD",
    "RetTD",
    "FumTD",
    "2PT",
    "Fum",
    "FanPtsAgainst-pts",
    "TouchCarries",
    "TouchReceptions",
    "Touches",
    "TargetsReceptions",
    "Targets",
    "ReceptionPercentage",
    "RzTarget",
    "RzTouch",
    "RzG2G",
    "Rank",
    "TotalPoints",
    "${weekNumber}",
    NOT INSTR("PlayerOpponent", '@')
from temp;

drop table temp;

END_SQL
    done
done

