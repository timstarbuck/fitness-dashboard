Looks at building a personal dashboard with data from activities fetched from Garmin personal API.

Thinking there could something which pulls activities with the following endpoint passing in a date/date range. 

In the end want the dashboard to show data total and average data per activity type and overall with
distance
time
heart rate (average/max)
elevation gain
anything else useful

Let's add a column to store the full Garmin payload (response) in a jsonb column alongside normalized fields.

Then create a the functionality to fetch the data. Below is an example, sync.ts would be driver, called by an api endpoint (should be protected with something in the header or qs). we will start with activities for now, sleep, hrv and bodyBattery will come later.

API Key is stored in the environment in GARMIN_API_KEY

```
/services/garmin/

token.ts
activities.ts
sleep.ts
hrv.ts
bodyBattery.ts
sync.ts
```

1)
We need to add startDate and endDate to the api route (src/app/api/sync/garmin/route.ts), src/services/garmin/sync.ts and src/services/garmin/activities.ts. Should default to previous day for startDate and current day for endDate. These should be sent as query string values to the Garmin as outlined below:

startDate
string($date)
(query)
Inclusive earliest activity start date, based on the activity's local start time, in YYYY-MM-DD format.

endDate
string($date)
(query)
Inclusive latest activity start date, based on the activity's local start time, in YYYY-MM-DD format.

2) activity_splits table (db/schema/index.ts) - RESOLVED: Added split fetching and processing in src/services/garmin/sync.ts

Create a bash script at scripts/sync_history.sh. 
It should run in a loop, fetching data 10 days at a time starting 7/1/2010 through the current date using the below curl command, substituting the dates as needed.

curl "http://localhost:3001/api/sync/garmin?token=$CRON_SECRET&startDate=2026-01-01&endDate=2026-01-02"

Log results in scripts/sync_history_logs


✓ Some older activities are missing endTimeGMT. When missing, compute it by adding the duration (which is in seconds) to the startTimeGMT in src/services/garmin/sync.ts
✓ Some older activities are missing activityName. When missing, use the activityType.typeKey  in src/services/garmin/sync.ts
✓ Add copilot instructions file for nextjs repo using tailwind, shadcn, drizzle, neon postgres

--------------------------------------
Goal - add HRV data to database and sync.

Add database table(s) db/schema/index.ts
fetch function (src/services/garmin/hrv.ts) and incorporate into src/services/garmin/sync.ts
Add a hrv_history_sync.sh script scripts


Fetch Method:
`/hrv-service/hrv/YYYY-MM-DD`


Fetch response from Garmin Docs
```json
{
  "userProfilePk": 0,
  "hrvSummary": {
    "calendarDate": "string",
    "weeklyAvg": 0,
    "lastNightAvg": 0,
    "lastNight5MinHigh": 0,
    "baseline": {
      "lowUpper": 0,
      "balancedLow": 0,
      "balancedUpper": 0,
      "markerValue": 0
    },
    "status": "NONE",
    "feedbackPhrase": "NONE",
    "createTimeStamp": "string"
  },
  "hrvReadings": [
    {
      "hrvValue": 0,
      "readingTimeGMT": "string",
      "readingTimeLocal": "string"
    }
  ],
  "startTimestampGMT": "string",
  "endTimestampGMT": "string",
  "startTimestampLocal": "string",
  "endTimestampLocal": "string",
  "sleepStartTimestampGMT": "string",
  "sleepEndTimestampGMT": "string",
  "sleepStartTimestampLocal": "string",
  "sleepEndTimestampLocal": "string"
}
```

-----------------------------------------
Goal - add sleep data to database and sync.
We want to be able to sync the sleep data indepently as well as with the normal sync process.

Add database table(s) db/schema/index.ts
fetch function (src/services/garmin/sleep.ts) and incorporate into src/services/garmin/sync.ts
Add a sleep_history_sync.sh script scripts

Fetch Method:
`/sleep-service/sleep/dailySleep?date=YYYY-MM-DD`

Sample response from garmin docs
```json
{
  "id": 0,
  "userProfilePK": 0,
  "calendarDate": "string",
  "sleepTimeSeconds": 0,
  "napTimeSeconds": 0,
  "sleepWindowConfirmed": true,
  "sleepWindowConfirmationType": "string",
  "sleepStartTimestampGMT": "2026-11-15T19:02:22.021Z",
  "sleepEndTimestampGMT": "2026-11-15T19:02:22.021Z",
  "sleepStartTimestampLocal": "2026-11-15T19:02:22.021Z",
  "sleepEndTimestampLocal": "2026-11-15T19:02:22.021Z",
  "autoSleepStartTimestampGMT": "2026-11-15T19:02:22.021Z",
  "autoSleepEndTimestampGMT": "2026-11-15T19:02:22.021Z",
  "sleepQualityTypePK": "string",
  "sleepResultTypePK": "string",
  "unmeasurableSleepSeconds": 0,
  "deepSleepSeconds": 0,
  "lightSleepSeconds": 0,
  "remSleepSeconds": 0,
  "awakeSleepSeconds": 0,
  "deviceRemCapable": true,
  "sleepFromDevice": true,
  "averageSpO2Value": 0,
  "lowestSpO2Value": 0,
  "highestSpO2Value": 0,
  "numberOfEventsBelowThreshold": 0,
  "averageSpO2HRSleep": 0,
  "spo2Threshold": 0,
  "averageRespirationValue": 0,
  "lowestRespirationValue": 0,
  "highestRespirationValue": 0,
  "awakeCount": 0,
  "avgSleepStress": 0,
  "ageGroup": "TEEN",
  "avgHeartRate": 0,
  "sleepScoreFeedback": "NONE",
  "sleepScoreInsight": "NONE",
  "sleepScorePersonalizedInsight": "NOT_AVAILABLE",
  "sleepScores": {
    "additionalProp1": {
      "value": 0,
      "qualifierKey": "string",
      "optimalStart": 0,
      "optimalEnd": 0,
      "idealStartInSeconds": 0,
      "idealEndInSeconds": 0
    },
    "additionalProp2": {
      "value": 0,
      "qualifierKey": "string",
      "optimalStart": 0,
      "optimalEnd": 0,
      "idealStartInSeconds": 0,
      "idealEndInSeconds": 0
    },
    "additionalProp3": {
      "value": 0,
      "qualifierKey": "string",
      "optimalStart": 0,
      "optimalEnd": 0,
      "idealStartInSeconds": 0,
      "idealEndInSeconds": 0
    }
  },
  "userNote": "string",
  "kidSleepNote": "string",
  "sleepVersion": 0,
  "sleepNeed": {
    "userProfilePk": 0,
    "calendarDate": "2026-11-15",
    "deviceId": 0,
    "timestampGmt": "2026-11-15T19:02:22.021Z",
    "baseline": 0,
    "actual": 0,
    "feedback": "string",
    "trainingFeedback": "string",
    "sleepHistoryAdjustment": "string",
    "hrvAdjustment": "string",
    "napAdjustment": "string",
    "displayedForTheDay": true,
    "recommendedBedtimeStartMins": 0,
    "recommendedBedtimeEndMins": 0,
    "preferredActivityTracker": true
  },
  "nextSleepNeed": {
    "userProfilePk": 0,
    "calendarDate": "2026-11-15",
    "deviceId": 0,
    "timestampGmt": "2026-11-15T19:02:22.021Z",
    "baseline": 0,
    "actual": 0,
    "feedback": "string",
    "trainingFeedback": "string",
    "sleepHistoryAdjustment": "string",
    "hrvAdjustment": "string",
    "napAdjustment": "string",
    "displayedForTheDay": true,
    "recommendedBedtimeStartMins": 0,
    "recommendedBedtimeEndMins": 0,
    "preferredActivityTracker": true
  },
  "dailyNapDTOS": [
    {
      "userProfilePK": 0,
      "deviceId": 0,
      "calendarDate": "2026-11-15",
      "napTimeSec": 0,
      "napStartTimestampGMT": "2026-11-15T19:02:22.021Z",
      "napEndTimestampGMT": "2026-11-15T19:02:22.021Z",
      "napFeedback": "string",
      "napSource": 0,
      "napStartTimeOffset": 0,
      "napEndTimeOffset": 0,
      "createTimestampGMT": "2026-11-15T19:02:22.021Z",
      "updateTimestampGMT": "2026-11-15T19:02:22.021Z"
    }
  ],
  "breathingDisruptionSeverity": "string",
  "sleepAlignment": {
    "userId": 0,
    "calendarDate": "2026-11-15",
    "deviceId": 0,
    "isPreferredActivityTracker": true,
    "sleepNeedBaselineMins": 0,
    "optimalSleepWindowStartMins": 0,
    "optimalSleepWindowEndMins": 0,
    "status": "string",
    "optimalSleepWindowMidpointMins": 0,
    "lastSleepMidpointMins": 0
  }
}
```
--------------------------------------------------------------------

Reference material:

Swagger Docs Page
https://developer.garmin.com/gc-developer-program/personal/swagger-docs/

Example fetching token 
curl -X POST 'https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token' -H 'Authorization: ApiKey xxxxx'

https://personal.connectapi.garmin.com

API Path
/activitylist-service/activities/search/activities

Sample response

[
  {
    "activityId": 0,
    "activityName": "string",
    "description": "string",
    "startTimeLocal": "2026-08-31 17:01:18",
    "startTimeGMT": "2026-08-31 22:01:18",
    "activityType": {
      "typeId": 1,
      "typeKey": "running",
      "parentTypeId": 17
    },
    "eventType": {
      "typeId": 0,
      "typeKey": "race"
    },
    "comments": [
      {
        "conversationCommentUuid": "string",
        "conversationCommentPk": 0,
        "conversationUuid": "string",
        "activityCommentPk": 0,
        "authorSocProfilePk": 0,
        "authorDisplayName": "string",
        "authorFullName": "string",
        "authorUserProfilePk": 0,
        "authorImageUrl": "string",
        "body": "string",
        "activityId": 0,
        "activityCommentLikeCount": 0,
        "requestorCanEdit": true,
        "requestorCanDelete": true,
        "authorPro": true,
        "createDate": "2026-11-12T14:05:30.854Z",
        "lastUpdatedDate": "2026-11-12T14:05:30.854Z",
        "activityCommentLikedByUser": true,
        "activityCommentLikeDisplayNames": [
          "string"
        ],
        "activityCommentLikeFullNames": [
          "string"
        ],
        "groupPk": 0,
        "activityCommentLikeAuthors": [
          {
            "userProfilePk": 0,
            "displayname": "string",
            "fullname": "string",
            "profileImageUrlLarge": "string",
            "profileImageUrlMedium": "string",
            "profileImageUrlSmall": "string"
          }
        ]
      }
    ],
    "isFavorite": true,
    "isPR": true,
    "isAutoCalcCalories": true,
    "isParent": true,
    "parentId": 0,
    "distance": 0,
    "duration": 2400.931884765625,
    "elapsedDuration": 2404.966064453125,
    "movingDuration": 2396.947021484375,
    "elevationGain": 0,
    "elevationLoss": 0,
    "averageSpeed": 0,
    "maxSpeed": 0,
    "startLatitude": 0,
    "startLongitude": 0,
    "hasPolyline": true,
    "hasImages": true,
    "ownerId": 0,
    "ownerDisplayName": "string",
    "ownerFullName": "string",
    "ownerProfileImageUrlSmall": "string",
    "ownerProfileImageUrlMedium": "string",
    "ownerProfileImageUrlLarge": "string",
    "calories": 0,
    "bmrCalories": 0,
    "averageHR": 0,
    "maxHR": 0,
    "averageRunningCadenceInStepsPerMinute": 0,
    "maxRunningCadenceInStepsPerMinute": 0,
    "maxLapAvgRunCadence": 0,
    "averageBikingCadenceInRevPerMinute": 0,
    "maxBikingCadenceInRevPerMinute": 0,
    "averageSwimCadenceInStrokesPerMinute": 0,
    "maxSwimCadenceInStrokesPerMinute": 0,
    "averageSwolf": 0,
    "activeLengths": 0,
    "steps": 0,
    "numberOfActivityLikes": 0,
    "numberOfActivityComments": 0,
    "likedByUser": true,
    "commentedByUser": true,
    "activityLikeDisplayNames": [
      "string"
    ],
    "activityLikeFullNames": [
      "string"
    ],
    "activityLikeProfileImageUrls": [
      "string"
    ],
    "requestorRelationship": "string",
    "privacy": {
      "typeId": 0,
      "typeKey": "private"
    },
    "poolLength": 0,
    "unitOfPoolLength": {
      "unitKey": "kilogram"
    },
    "hasVideo": true,
    "videoUrl": "string",
    "beginTimestamp": 1788213678000,
    "sportTypeId": 0,
    "avgPower": 0,
    "maxPower": 0,
    "aerobicTrainingEffect": 0,
    "anaerobicTrainingEffect": 0,
    "strokes": 0,
    "normPower": 0,
    "leftBalance": 0,
    "rightBalance": 0,
    "avgLeftBalance": 0,
    "max20MinPower": 0,
    "avgVerticalOscillation": 0,
    "avgGroundContactTime": 0,
    "avgStrideLength": 0,
    "avgFractionalCadence": 0,
    "maxFractionalCadence": 0,
    "trainingStressScore": 0,
    "intensityFactor": 0,
    "vO2MaxValue": 0,
    "avgVerticalRatio": 0,
    "avgGroundContactBalance": 0,
    "lactateThresholdBpm": 0,
    "getlactateThresholdSpeed": 0,
    "maxFtp": 0,
    "avgStrokeDistance": 0,
    "avgStrokeCadence": 0,
    "maxStrokeCadence": 0,
    "avgStrokes": 0,
    "minStrokes": 0,
    "minTemperature": 0,
    "maxTemperature": 0,
    "minElevation": 0,
    "maxElevation": 0,
    "avgElevation": 0,
    "avgDoubleCadence": 0,
    "maxDoubleCadence": 0,
    "isElevationCorrected": true,
    "summarizedExerciseSets": [
      {
        "category": "string",
        "subCategory": "string",
        "reps": 0,
        "volume": 0,
        "duration": 0,
        "sets": 0,
        "maxWeight": 0,
        "peakPower": 0,
        "concentricMeanVelocity": 0
      }
    ],
    "maxDepth": 0,
    "avgDepth": 0,
    "surfaceInterval": 0,
    "startN2": 0,
    "endN2": 0,
    "startCns": 0,
    "endCns": 0,
    "isDecoDive": true,
    "summarizedDiveInfo": {
      "weight": 0,
      "weightUnit": {
        "unitKey": "kilogram"
      },
      "visibility": 0,
      "visibilityUnit": {
        "unitKey": "kilogram"
      },
      "surfaceCondition": "string",
      "current": "string",
      "waterType": 0,
      "waterDensity": 0,
      "summarizedDiveGases": [
        {
          "heliumContent": 0,
          "oxygenContent": 0,
          "gasIndex": 0,
          "gasMode": 0
        }
      ],
      "totalSurfaceTime": 0
    },
    "diveCount": 0,
    "activityLikeAuthors": [
      {
        "userProfilePk": 0,
        "displayname": "string",
        "fullname": "string",
        "profileImageUrlLarge": "string",
        "profileImageUrlMedium": "string",
        "profileImageUrlSmall": "string"
      }
    ],
    "avgVerticalSpeed": 0,
    "maxVerticalSpeed": 0,
    "floorsClimbed": 0,
    "floorsDescended": 0,
    "manufacturer": "string",
    "diveNumber": 0,
    "locationName": "string",
    "bottomTime": 0,
    "lapCount": 0,
    "endLatitude": 0,
    "endLongitude": 0,
    "flow": 0,
    "grit": 0,
    "jumpCount": 0,
    "caloriesEstimated": 0,
    "caloriesConsumed": 0,
    "waterEstimated": 0,
    "waterConsumed": 0,
    "maxAvgPower_1": 0,
    "maxAvgPower_2": 0,
    "maxAvgPower_5": 0,
    "maxAvgPower_10": 0,
    "maxAvgPower_20": 0,
    "maxAvgPower_30": 0,
    "maxAvgPower_60": 0,
    "maxAvgPower_120": 0,
    "maxAvgPower_300": 0,
    "maxAvgPower_600": 0,
    "maxAvgPower_1200": 0,
    "maxAvgPower_1800": 0,
    "maxAvgPower_3600": 0,
    "maxAvgPower_7200": 0,
    "maxAvgPower_18000": 0,
    "excludeFromPowerCurveReports": true,
    "totalSets": 0,
    "activeSets": 0,
    "totalReps": 0,
    "minRespirationRate": 0,
    "maxRespirationRate": 0,
    "avgRespirationRate": 0,
    "trainingEffectLabel": "string",
    "activityTrainingLoad": 0,
    "avgFlow": 0,
    "avgGrit": 0,
    "minActivityLapDuration": 1199.947021484375,
    "avgStress": 0,
    "startStress": 0,
    "endStress": 0,
    "differenceStress": 0,
    "maxStress": 0,
    "aerobicTrainingEffectMessage": "string",
    "anaerobicTrainingEffectMessage": "string",
    "splitSummaries": [
      {
        "noOfSplits": 0,
        "maxGradeValue": {
          "valueKey": "_5_1",
          "scale": "YDS"
        },
        "totalAscent": 0,
        "duration": 0,
        "splitType": "PACE_PRO_SPLIT",
        "numClimbSends": 0,
        "maxElevationGain": 0,
        "averageElevationGain": 0,
        "maxDistance": 0,
        "maxDistanceWithPrecision": 0,
        "distance": 0,
        "averageSpeed": 0,
        "maxSpeed": 0,
        "mode": "ADVANCED",
        "numFalls": 0,
        "avgStress": 0,
        "avgStressWin": 0,
        "avgStressLoss": 0,
        "avgStressDraw": 0,
        "gamesWon": 0,
        "gamesNotWon": 0,
        "gamesAverageWon": 0,
        "elevationLoss": 0,
        "maxPackWeight": 0,
        "avgPackWeight": 0,
        "maxDuration": 0,
        "avgReactionTime": 0,
        "minReactionTime": 0,
        "avgDistanceToMaxSpeed": 0,
        "avgStepFrequency": 0,
        "maxStepFrequency": 0,
        "avgStepLength": 0,
        "verticalRatio": 0,
        "verticalOscillation": 0,
        "avgGroundContactBalanceLeft": 0,
        "avgGroundContactTime": 0,
        "avgStanceTimePercent": 0
      }
    ],
    "isManualActivity": true,
    "moderateIntensityMinutes": 0,
    "vigorousIntensityMinutes": 0,
    "maxBottomTime": 0,
    "hasSeedFirstbeatProfile": true,
    "avgGradeAdjustedSpeed": 0,
    "avgWheelchairCadence": 0,
    "maxWheelchairCadence": 0,
    "avgJumpRopeCadence": 0,
    "maxJumpRopeCadence": 0,
    "gameName": "string",
    "differenceBodyBattery": 100,
    "gameType": "GENERIC_WIN_LOSS_RESULT",
    "beginPackWeight": 0,
    "fastestSplit_1000": 0,
    "fastestSplit_1609": 0,
    "fastestSplit_5000": 0,
    "fastestSplit_10000": 0,
    "fastestSplit_21098": 0,
    "fastestSplit_42195": 0,
    "fastestSplit_40000": 0,
    "fastestSplit_100": 0,
    "fastestSplit_400": 0,
    "fastestSplit_750": 0,
    "fastestSplit_1500": 0,
    "fastestSplit_91": 0,
    "fastestSplit_457": 0,
    "fastestSplit_914": 0,
    "fastestSplit_1508": 0,
    "impactLoad": 0,
    "avgStepSpeedLoss": 0,
    "avgStepSpeedLossPercent": 0,
    "hrTimeInZone_1": 6.001,
    "hrTimeInZone_2": 30,
    "hrTimeInZone_3": 793.001,
    "hrTimeInZone_4": 1120.344,
    "hrTimeInZone_5": 446.603,
    "powerTimeInZone_1": 351.933,
    "powerTimeInZone_2": 1300.59,
    "powerTimeInZone_3": 409.005,
    "powerTimeInZone_4": 224.005,
    "powerTimeInZone_5": 79.999,
    "powerTimeInZone_6": 26.005,
    "powerTimeInZone_7": 8.999,
    "longestPoolApneaInterval": 0,
    "avgForce": 0,
    "maxForce": 0,
    "normalizedForce": 0,
    "poolApneaBreathHoldDuration": 0,
    "deviceDisplayUnitsDTO": {
      "distanceDisplayMeasure": "string",
      "elevationDisplayMeasure": "string",
      "speedDisplayMeasure": "string",
      "verticalSpeedDisplayMeasure": "string"
    },
    "endTimeGMT": "2026-08-31 22:41:22",
    "qualifyingDive": true,
    "multiDayActivityUUIDs": [
      "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    ],
    "activityUUID": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "carbonOffset": 0,
    "packWeightCalories": 0,
    "standingTime": 0,
    "seatedTime": 0,
    "maxStandingPower": 0,
    "maxSeatedPower": 0,
    "avgStandingPower": 0,
    "avgSeatedPower": 0,
    "parent": true,
    "decoDive": true,
    "elevationCorrected": true,
    "pr": true,
    "manualActivity": true,
    "favorite": true,
    "autoCalcCalories": true
  }
]
No links
400	


---------------------

setup unit testing
src/app/api/sync/garmin/route.ts
src/services/garmin/activities.ts
src/services/garmin/hrv.ts
src/services/garmin/sleep.ts
src/services/garmin/sync.ts
src/services/garmin/syncLock.ts
src/services/garmin/token.ts

