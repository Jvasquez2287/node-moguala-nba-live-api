



// fectch api https://cdn.nba.com/static/json/liveData/odds/odds_todaysGames.json
/* response from odds api schema
 {
    "games": [
        {
            "gameId": "0022500876",
            "sr_id": "sr:match:62925677",
            "srMatchId": "62925677",
            "homeTeamId": "1610612742",
            "awayTeamId": "1610612760",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "6.000",
                                    "opening_odds": "5.600",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.060",
                                    "opening_odds": "1.030",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "8.700",
                                    "opening_odds": "4.700",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.080",
                                    "opening_odds": "1.190",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "8.700",
                                    "opening_odds": "4.700",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.080",
                                    "opening_odds": "1.190",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "8.500",
                                    "opening_odds": "8.000",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.083",
                                    "opening_odds": "1.091",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "8.000",
                                    "opening_odds": "8.000",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.090",
                                    "opening_odds": "1.090",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.083",
                                    "opening_odds": "1.083",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "8.500",
                                    "opening_odds": "8.500",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.670",
                                    "opening_odds": "1.730",
                                    "spread": "16.5",
                                    "opening_spread": 17.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.730",
                                    "opening_odds": "1.670",
                                    "spread": "-16.5",
                                    "opening_spread": -17.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "14.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-14.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.750",
                                    "odds_trend": "down",
                                    "spread": "16.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.960",
                                    "odds_trend": "up",
                                    "spread": "-16.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.750",
                                    "odds_trend": "down",
                                    "spread": "16.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.960",
                                    "odds_trend": "up",
                                    "spread": "-16.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.893",
                                    "opening_odds": "1.909",
                                    "spread": "16.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.926",
                                    "opening_odds": "1.909",
                                    "spread": "-16.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.800",
                                    "spread": "16",
                                    "opening_spread": 16.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.950",
                                    "spread": "-16",
                                    "opening_spread": -16.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.540",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "11.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.526",
                                    "opening_odds": "1.952",
                                    "odds_trend": "down",
                                    "spread": "-11.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500874",
            "sr_id": "sr:match:62926181",
            "srMatchId": "62926181",
            "homeTeamId": "1610612738",
            "awayTeamId": "1610612755",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.220",
                                    "opening_odds": "1.220",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.350",
                                    "opening_odds": "2.950",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.290",
                                    "opening_odds": "1.540",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.750",
                                    "opening_odds": "2.500",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.290",
                                    "opening_odds": "1.540",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.750",
                                    "opening_odds": "2.500",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.313",
                                    "opening_odds": "1.370",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.600",
                                    "opening_odds": "3.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.280",
                                    "opening_odds": "1.320",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.800",
                                    "opening_odds": "3.500",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.800",
                                    "opening_odds": "3.600",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.286",
                                    "opening_odds": "1.308",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.700",
                                    "opening_odds": "1.700",
                                    "spread": "-8.5",
                                    "opening_spread": -8.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.700",
                                    "spread": "8.5",
                                    "opening_spread": 8.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-9.5",
                                    "opening_spread": -9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "9.5",
                                    "opening_spread": 9.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.770",
                                    "odds_trend": "up",
                                    "spread": "-7.5",
                                    "opening_spread": -3.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.070",
                                    "opening_odds": "1.930",
                                    "odds_trend": "down",
                                    "spread": "7.5",
                                    "opening_spread": 3.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.770",
                                    "odds_trend": "up",
                                    "spread": "-7.5",
                                    "opening_spread": -3.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.070",
                                    "opening_odds": "1.930",
                                    "odds_trend": "down",
                                    "spread": "7.5",
                                    "opening_spread": 3.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "-8.5",
                                    "opening_spread": -7
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "8.5",
                                    "opening_spread": 7
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "3.400",
                                    "opening_odds": "1.900",
                                    "odds_trend": "up",
                                    "spread": "-17.5",
                                    "opening_spread": -8
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.280",
                                    "opening_odds": "1.900",
                                    "odds_trend": "down",
                                    "spread": "17.5",
                                    "opening_spread": 8
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.980",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "-9.5",
                                    "opening_spread": -8.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "9.5",
                                    "opening_spread": 8.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500877",
            "sr_id": "sr:match:62926513",
            "srMatchId": "62926513",
            "homeTeamId": "1610612746",
            "awayTeamId": "1610612740",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.270",
                                    "opening_odds": "1.350",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.150",
                                    "opening_odds": "2.450",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.280",
                                    "opening_odds": "1.490",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.850",
                                    "opening_odds": "2.650",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.280",
                                    "opening_odds": "1.490",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.850",
                                    "opening_odds": "2.650",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.294",
                                    "opening_odds": "1.392",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.750",
                                    "opening_odds": "3.100",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.320",
                                    "opening_odds": "1.410",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.500",
                                    "opening_odds": "3.000",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.600",
                                    "opening_odds": "3.000",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.308",
                                    "opening_odds": "1.400",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.650",
                                    "opening_odds": "1.730",
                                    "odds_trend": "down",
                                    "spread": "-8.5",
                                    "opening_spread": -6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.730",
                                    "opening_odds": "1.670",
                                    "odds_trend": "up",
                                    "spread": "8.5",
                                    "opening_spread": 6.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-7.5",
                                    "opening_spread": -8.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "7.5",
                                    "opening_spread": 8.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.900",
                                    "odds_trend": "down",
                                    "spread": "-7.5",
                                    "opening_spread": -5.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.080",
                                    "opening_odds": "1.800",
                                    "odds_trend": "up",
                                    "spread": "7.5",
                                    "opening_spread": 5.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.900",
                                    "odds_trend": "down",
                                    "spread": "-7.5",
                                    "opening_spread": -5.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.080",
                                    "opening_odds": "1.800",
                                    "odds_trend": "up",
                                    "spread": "7.5",
                                    "opening_spread": 5.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "-8.5",
                                    "opening_spread": -6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "8.5",
                                    "opening_spread": 6.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "3.700",
                                    "opening_odds": "2.000",
                                    "odds_trend": "down",
                                    "spread": "-17.5",
                                    "opening_spread": -7.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.250",
                                    "opening_odds": "1.750",
                                    "odds_trend": "up",
                                    "spread": "17.5",
                                    "opening_spread": 7.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "3.300",
                                    "opening_odds": "1.952",
                                    "odds_trend": "down",
                                    "spread": "-15.5",
                                    "opening_spread": -6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.351",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "15.5",
                                    "opening_spread": 6.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500878",
            "sr_id": "sr:match:62924675",
            "srMatchId": "62924675",
            "homeTeamId": "1610612747",
            "awayTeamId": "1610612758",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.120",
                                    "opening_odds": "1.120",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "4.700",
                                    "opening_odds": "3.900",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.120",
                                    "opening_odds": "1.160",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.200",
                                    "opening_odds": "5.200",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.120",
                                    "opening_odds": "1.160",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.200",
                                    "opening_odds": "5.200",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.133",
                                    "opening_odds": "1.133",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.600",
                                    "opening_odds": "6.300",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.150",
                                    "opening_odds": "1.140",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.800",
                                    "opening_odds": "6.000",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "6.500",
                                    "opening_odds": "6.250",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.125",
                                    "opening_odds": "1.133",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.650",
                                    "opening_odds": "1.700",
                                    "spread": "-12.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.750",
                                    "opening_odds": "1.700",
                                    "spread": "12.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-12.5",
                                    "opening_spread": -13.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "12.5",
                                    "opening_spread": 13.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.950",
                                    "opening_odds": "1.840",
                                    "odds_trend": "up",
                                    "spread": "-13.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.820",
                                    "opening_odds": "1.850",
                                    "odds_trend": "down",
                                    "spread": "13.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.950",
                                    "opening_odds": "1.840",
                                    "odds_trend": "up",
                                    "spread": "-13.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.820",
                                    "opening_odds": "1.850",
                                    "odds_trend": "down",
                                    "spread": "13.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "-13",
                                    "opening_spread": -13.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "13",
                                    "opening_spread": 13.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.750",
                                    "odds_trend": "up",
                                    "spread": "-12.5",
                                    "opening_spread": -12.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.850",
                                    "opening_odds": "2.000",
                                    "odds_trend": "down",
                                    "spread": "12.5",
                                    "opening_spread": 12.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.250",
                                    "opening_odds": "1.952",
                                    "odds_trend": "up",
                                    "spread": "-15.5",
                                    "opening_spread": -13.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.645",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "15.5",
                                    "opening_spread": 13.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500879",
            "sr_id": "sr:match:62926281",
            "srMatchId": "62926281",
            "homeTeamId": "1610612764",
            "awayTeamId": "1610612745",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "5.700",
                                    "opening_odds": "4.900",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.070",
                                    "opening_odds": "1.060",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "7.300",
                                    "opening_odds": "4.600",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.100",
                                    "opening_odds": "1.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "7.300",
                                    "opening_odds": "4.600",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.100",
                                    "opening_odds": "1.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "7.600",
                                    "opening_odds": "8.000",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.100",
                                    "opening_odds": "1.091",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "7.000",
                                    "opening_odds": "7.500",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.110",
                                    "opening_odds": "1.100",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.091",
                                    "opening_odds": "1.083",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "7.500",
                                    "opening_odds": "8.250",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.730",
                                    "opening_odds": "1.730",
                                    "spread": "14.5",
                                    "opening_spread": 14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.650",
                                    "opening_odds": "1.650",
                                    "spread": "-14.5",
                                    "opening_spread": -14.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "14.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-14.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.820",
                                    "opening_odds": "1.760",
                                    "odds_trend": "up",
                                    "spread": "15.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.990",
                                    "opening_odds": "1.950",
                                    "odds_trend": "down",
                                    "spread": "-15.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.820",
                                    "opening_odds": "1.760",
                                    "odds_trend": "up",
                                    "spread": "15.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.990",
                                    "opening_odds": "1.950",
                                    "odds_trend": "down",
                                    "spread": "-15.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.943",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "14.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.877",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "-14.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "2.000",
                                    "odds_trend": "down",
                                    "spread": "15.5",
                                    "opening_spread": 14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.000",
                                    "opening_odds": "1.750",
                                    "odds_trend": "up",
                                    "spread": "-15.5",
                                    "opening_spread": -14.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "14.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "-14.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500880",
            "sr_id": "sr:match:62924839",
            "srMatchId": "62924839",
            "homeTeamId": "1610612749",
            "awayTeamId": "1610612738",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.910",
                                    "opening_odds": "2.950",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.300",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.750",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "1.450",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.750",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "1.450",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.040",
                                    "opening_odds": "3.400",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.758",
                                    "opening_odds": "1.339",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.150",
                                    "opening_odds": "3.200",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.730",
                                    "opening_odds": "1.370",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.714",
                                    "opening_odds": "1.333",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "2.150",
                                    "opening_odds": "3.400",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.670",
                                    "opening_odds": "1.650",
                                    "spread": "2.5",
                                    "opening_spread": 7.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.730",
                                    "opening_odds": "1.730",
                                    "spread": "-2.5",
                                    "opening_spread": -7.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "1.900",
                                    "spread": "1.5",
                                    "opening_spread": 7.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "1.900",
                                    "spread": "-1.5",
                                    "opening_spread": -7.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.930",
                                    "opening_odds": "1.860",
                                    "odds_trend": "down",
                                    "spread": "1.5",
                                    "opening_spread": 5.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.830",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "-1.5",
                                    "opening_spread": -5.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.930",
                                    "opening_odds": "1.860",
                                    "odds_trend": "down",
                                    "spread": "1.5",
                                    "opening_spread": 5.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.830",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "-1.5",
                                    "opening_spread": -5.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "2",
                                    "opening_spread": 7.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-2",
                                    "opening_spread": -7.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.900",
                                    "odds_trend": "up",
                                    "spread": "3.5",
                                    "opening_spread": 7
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.000",
                                    "opening_odds": "1.900",
                                    "odds_trend": "down",
                                    "spread": "-3.5",
                                    "opening_spread": -7
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.200",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up",
                                    "spread": "11.5",
                                    "opening_spread": 6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "4.330",
                                    "opening_odds": "1.833",
                                    "odds_trend": "down",
                                    "spread": "-11.5",
                                    "opening_spread": -6.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500881",
            "sr_id": "sr:match:62925893",
            "srMatchId": "62925893",
            "homeTeamId": "1610612762",
            "awayTeamId": "1610612743",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.500",
                                    "opening_odds": "3.650",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.130",
                                    "opening_odds": "1.140",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.950",
                                    "opening_odds": "4.650",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.180",
                                    "opening_odds": "1.190",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.950",
                                    "opening_odds": "4.650",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.180",
                                    "opening_odds": "1.190",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "5.600",
                                    "opening_odds": "4.800",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.161",
                                    "opening_odds": "1.204",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "5.000",
                                    "opening_odds": "5.000",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.190",
                                    "opening_odds": "1.190",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.167",
                                    "opening_odds": "1.160",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.250",
                                    "opening_odds": "5.500",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.670",
                                    "opening_odds": "1.650",
                                    "spread": "11.5",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.730",
                                    "opening_odds": "1.730",
                                    "spread": "-11.5",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "11.5",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-11.5",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.930",
                                    "opening_odds": "1.750",
                                    "odds_trend": "down",
                                    "spread": "10.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.840",
                                    "opening_odds": "1.950",
                                    "odds_trend": "up",
                                    "spread": "-10.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.930",
                                    "opening_odds": "1.750",
                                    "odds_trend": "down",
                                    "spread": "10.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.840",
                                    "opening_odds": "1.950",
                                    "odds_trend": "up",
                                    "spread": "-10.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "12",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-12",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "1.900",
                                    "odds_trend": "down",
                                    "spread": "10.5",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.750",
                                    "opening_odds": "1.850",
                                    "odds_trend": "up",
                                    "spread": "-10.5",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.833",
                                    "odds_trend": "down",
                                    "spread": "11.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up",
                                    "spread": "-11.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500882",
            "sr_id": "sr:match:62926165",
            "srMatchId": "62926165",
            "homeTeamId": "1610612744",
            "awayTeamId": "1610612746",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.570",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.910",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "1.580",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.840",
                                    "opening_odds": "2.400",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "1.580",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.840",
                                    "opening_odds": "2.400",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.020",
                                    "opening_odds": "1.926",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.833",
                                    "opening_odds": "1.926",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.920",
                                    "opening_odds": "2.050",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.800",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.870",
                                    "opening_odds": "1.741",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.952",
                                    "opening_odds": "2.100",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:818",
                            "name": "Supermatch",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.650",
                                    "opening_odds": "1.670",
                                    "spread": "1.5",
                                    "opening_spread": -1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.750",
                                    "opening_odds": "1.730",
                                    "spread": "-1.5",
                                    "opening_spread": 1.5
                                }
                            ],
                            "url": "https://sitio.supermatch.com.uy/prematch/492/betting/sports/3/leagues/-1003",
                            "countryCode": "UY"
                        },
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "1.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-1.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.860",
                                    "opening_odds": "1.910",
                                    "odds_trend": "up",
                                    "spread": "1.5",
                                    "opening_spread": -4.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.940",
                                    "opening_odds": "1.790",
                                    "odds_trend": "down",
                                    "spread": "-1.5",
                                    "opening_spread": 4.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.860",
                                    "opening_odds": "1.910",
                                    "odds_trend": "up",
                                    "spread": "1.5",
                                    "opening_spread": -4.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.940",
                                    "opening_odds": "1.790",
                                    "odds_trend": "down",
                                    "spread": "-1.5",
                                    "opening_spread": 4.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.893",
                                    "opening_odds": "1.943",
                                    "odds_trend": "down",
                                    "spread": "1.5",
                                    "opening_spread": -1
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.926",
                                    "opening_odds": "1.877",
                                    "odds_trend": "up",
                                    "spread": "-1.5",
                                    "opening_spread": 1
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.720",
                                    "opening_odds": "1.800",
                                    "odds_trend": "down",
                                    "spread": "2.5",
                                    "opening_spread": 2.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "2.050",
                                    "opening_odds": "1.950",
                                    "odds_trend": "up",
                                    "spread": "-2.5",
                                    "opening_spread": -2.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.182",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "11.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "5.000",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "-11.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500885",
            "sr_id": "sr:match:62925009",
            "srMatchId": "62925009",
            "homeTeamId": "1610612753",
            "awayTeamId": "1610612764",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.110",
                                    "opening_odds": "1.110",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.600",
                                    "opening_odds": "6.400",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.110",
                                    "opening_odds": "1.110",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.600",
                                    "opening_odds": "6.400",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.091",
                                    "opening_odds": "1.091",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "8.000",
                                    "opening_odds": "8.000",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.090",
                                    "opening_odds": "1.090",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "8.000",
                                    "opening_odds": "8.000",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "8.250",
                                    "opening_odds": "8.500",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.083",
                                    "opening_odds": "1.083",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-14.5",
                                    "opening_spread": -14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "14.5",
                                    "opening_spread": 14.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.870",
                                    "opening_odds": "1.940",
                                    "odds_trend": "up",
                                    "spread": "-15.5",
                                    "opening_spread": -14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.760",
                                    "odds_trend": "down",
                                    "spread": "15.5",
                                    "opening_spread": 14.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.870",
                                    "opening_odds": "1.940",
                                    "odds_trend": "up",
                                    "spread": "-15.5",
                                    "opening_spread": -14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.760",
                                    "odds_trend": "down",
                                    "spread": "15.5",
                                    "opening_spread": 14.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-15.5",
                                    "opening_spread": -15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "15.5",
                                    "opening_spread": 15.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.000",
                                    "spread": "-16.5",
                                    "opening_spread": -16.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.750",
                                    "opening_odds": "1.750",
                                    "spread": "16.5",
                                    "opening_spread": 16.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-15.5",
                                    "opening_spread": -15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "15.5",
                                    "opening_spread": 15.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500884",
            "sr_id": "sr:match:62925749",
            "srMatchId": "62925749",
            "homeTeamId": "1610612739",
            "awayTeamId": "1610612765",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.200",
                                    "opening_odds": "1.980",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.820",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.200",
                                    "opening_odds": "1.980",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.820",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.200",
                                    "opening_odds": "2.100",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.704",
                                    "opening_odds": "1.769",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.200",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.850",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.690",
                                    "opening_odds": "1.833",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "2.180",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up",
                                    "spread": "0.5",
                                    "opening_spread": 0.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "1.800",
                                    "odds_trend": "down",
                                    "spread": "-0.5",
                                    "opening_spread": -0.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.920",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "2.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.880",
                                    "opening_odds": "1.860",
                                    "odds_trend": "down",
                                    "spread": "-2.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.920",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "2.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.880",
                                    "opening_odds": "1.860",
                                    "odds_trend": "down",
                                    "spread": "-2.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "2",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-2",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.950",
                                    "opening_odds": "1.800",
                                    "odds_trend": "up",
                                    "spread": "1.5",
                                    "opening_spread": 2.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "1.950",
                                    "odds_trend": "down",
                                    "spread": "-1.5",
                                    "opening_spread": -2.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "2.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "-2.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500883",
            "sr_id": "sr:match:62925897",
            "srMatchId": "62925897",
            "homeTeamId": "1610612766",
            "awayTeamId": "1610612742",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.140",
                                    "opening_odds": "1.250",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.000",
                                    "opening_odds": "3.950",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.140",
                                    "opening_odds": "1.250",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.000",
                                    "opening_odds": "3.950",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.154",
                                    "opening_odds": "1.238",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.800",
                                    "opening_odds": "4.300",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.160",
                                    "opening_odds": "1.190",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.500",
                                    "opening_odds": "5.000",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "5.750",
                                    "opening_odds": "5.000",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.154",
                                    "opening_odds": "1.182",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-11.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "11.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.860",
                                    "odds_trend": "down",
                                    "spread": "-12.5",
                                    "opening_spread": -9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "12.5",
                                    "opening_spread": 9.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.860",
                                    "odds_trend": "down",
                                    "spread": "-12.5",
                                    "opening_spread": -9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "12.5",
                                    "opening_spread": 9.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-12.5",
                                    "opening_spread": -10
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "12.5",
                                    "opening_spread": 10
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.850",
                                    "opening_odds": "2.000",
                                    "odds_trend": "down",
                                    "spread": "-12.5",
                                    "opening_spread": -12.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.750",
                                    "odds_trend": "up",
                                    "spread": "12.5",
                                    "opening_spread": 12.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.952",
                                    "odds_trend": "up",
                                    "spread": "-12.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.952",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "12.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500887",
            "sr_id": "sr:match:62925237",
            "srMatchId": "62925237",
            "homeTeamId": "1610612761",
            "awayTeamId": "1610612752",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.150",
                                    "opening_odds": "2.040",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.740",
                                    "opening_odds": "1.780",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.150",
                                    "opening_odds": "2.040",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.740",
                                    "opening_odds": "1.780",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.180",
                                    "opening_odds": "2.120",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.725",
                                    "opening_odds": "1.758",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.200",
                                    "opening_odds": "2.000",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.700",
                                    "opening_odds": "1.850",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.690",
                                    "opening_odds": "1.800",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "2.180",
                                    "opening_odds": "2.050",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.000",
                                    "spread": "1.5",
                                    "opening_spread": 0.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "1.800",
                                    "spread": "-1.5",
                                    "opening_spread": -0.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.890",
                                    "opening_odds": "1.760",
                                    "odds_trend": "down",
                                    "spread": "2.5",
                                    "opening_spread": 2.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.910",
                                    "opening_odds": "1.940",
                                    "odds_trend": "up",
                                    "spread": "-2.5",
                                    "opening_spread": -2.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.890",
                                    "opening_odds": "1.760",
                                    "odds_trend": "down",
                                    "spread": "2.5",
                                    "opening_spread": 2.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.910",
                                    "opening_odds": "1.940",
                                    "odds_trend": "up",
                                    "spread": "-2.5",
                                    "opening_spread": -2.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.943",
                                    "odds_trend": "down",
                                    "spread": "2.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.877",
                                    "odds_trend": "up",
                                    "spread": "-2.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.800",
                                    "spread": "3",
                                    "opening_spread": 2.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.950",
                                    "spread": "-3",
                                    "opening_spread": -2.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "2.5",
                                    "opening_spread": 1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "-2.5",
                                    "opening_spread": -1.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500886",
            "sr_id": "sr:match:62925757",
            "srMatchId": "62925757",
            "homeTeamId": "1610612748",
            "awayTeamId": "1610612751",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.130",
                                    "opening_odds": "1.160",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.400",
                                    "opening_odds": "5.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.130",
                                    "opening_odds": "1.160",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.400",
                                    "opening_odds": "5.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.125",
                                    "opening_odds": "1.161",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.600",
                                    "opening_odds": "5.600",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.140",
                                    "opening_odds": "1.130",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.000",
                                    "opening_odds": "6.500",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "6.250",
                                    "opening_odds": "6.500",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.133",
                                    "opening_odds": "1.125",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-12.5",
                                    "opening_spread": -12.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "12.5",
                                    "opening_spread": 12.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "-13.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "13.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.830",
                                    "odds_trend": "up",
                                    "spread": "-13.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "13.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.926",
                                    "opening_odds": "1.877",
                                    "spread": "-13.5",
                                    "opening_spread": -12.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.893",
                                    "opening_odds": "1.943",
                                    "spread": "13.5",
                                    "opening_spread": 12.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.950",
                                    "opening_odds": "1.750",
                                    "odds_trend": "down",
                                    "spread": "-14.5",
                                    "opening_spread": -12.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.800",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up",
                                    "spread": "14.5",
                                    "opening_spread": 12.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.952",
                                    "odds_trend": "down",
                                    "spread": "-13.5",
                                    "opening_spread": -13.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "13.5",
                                    "opening_spread": 13.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500888",
            "sr_id": "sr:match:62924603",
            "srMatchId": "62924603",
            "homeTeamId": "1610612755",
            "awayTeamId": "1610612759",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.600",
                                    "opening_odds": "3.150",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.310",
                                    "opening_odds": "1.360",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.600",
                                    "opening_odds": "3.150",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.310",
                                    "opening_odds": "1.360",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.500",
                                    "opening_odds": "2.900",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.323",
                                    "opening_odds": "1.435",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.400",
                                    "opening_odds": "2.800",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.340",
                                    "opening_odds": "1.460",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.308",
                                    "opening_odds": "1.426",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.600",
                                    "opening_odds": "2.900",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "7.5",
                                    "opening_spread": 4.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-7.5",
                                    "opening_spread": -4.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.960",
                                    "opening_odds": "1.790",
                                    "odds_trend": "up",
                                    "spread": "7.5",
                                    "opening_spread": 6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.840",
                                    "opening_odds": "1.910",
                                    "odds_trend": "down",
                                    "spread": "-7.5",
                                    "opening_spread": -6.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.960",
                                    "opening_odds": "1.790",
                                    "odds_trend": "up",
                                    "spread": "7.5",
                                    "opening_spread": 6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.840",
                                    "opening_odds": "1.910",
                                    "odds_trend": "down",
                                    "spread": "-7.5",
                                    "opening_spread": -6.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "8",
                                    "opening_spread": 6
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-8",
                                    "opening_spread": -6
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "odds_trend": "up",
                                    "spread": "8",
                                    "opening_spread": 5.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.850",
                                    "odds_trend": "down",
                                    "spread": "-8",
                                    "opening_spread": -5.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.980",
                                    "opening_odds": "1.952",
                                    "odds_trend": "up",
                                    "spread": "7.5",
                                    "opening_spread": 6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.847",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "-7.5",
                                    "opening_spread": -6.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500889",
            "sr_id": "sr:match:62925575",
            "srMatchId": "62925575",
            "homeTeamId": "1610612741",
            "awayTeamId": "1610612760",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.650",
                                    "opening_odds": "6.800",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.210",
                                    "opening_odds": "1.100",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.650",
                                    "opening_odds": "6.800",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.210",
                                    "opening_odds": "1.100",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.600",
                                    "opening_odds": "5.000",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.217",
                                    "opening_odds": "1.192",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.200",
                                    "opening_odds": "5.000",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.240",
                                    "opening_odds": "1.190",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.235",
                                    "opening_odds": "1.200",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "4.250",
                                    "opening_odds": "4.750",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "9.5",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-9.5",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.760",
                                    "odds_trend": "up",
                                    "spread": "10.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.940",
                                    "odds_trend": "down",
                                    "spread": "-10.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.760",
                                    "odds_trend": "up",
                                    "spread": "10.5",
                                    "opening_spread": 15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.940",
                                    "odds_trend": "down",
                                    "spread": "-10.5",
                                    "opening_spread": -15.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.943",
                                    "spread": "10.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.877",
                                    "spread": "-10.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "2.000",
                                    "spread": "10",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.750",
                                    "spread": "-10",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.870",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "10.5",
                                    "opening_spread": 11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.952",
                                    "opening_odds": "1.980",
                                    "odds_trend": "down",
                                    "spread": "-10.5",
                                    "opening_spread": -11.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500890",
            "sr_id": "sr:match:62926169",
            "srMatchId": "62926169",
            "homeTeamId": "1610612750",
            "awayTeamId": "1610612763",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.130",
                                    "opening_odds": "1.090",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.900",
                                    "opening_odds": "7.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.130",
                                    "opening_odds": "1.090",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "5.900",
                                    "opening_odds": "7.200",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.133",
                                    "opening_odds": "1.118",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.300",
                                    "opening_odds": "6.900",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.130",
                                    "opening_odds": "1.130",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "6.500",
                                    "opening_odds": "6.500",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "6.500",
                                    "opening_odds": "7.250",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.125",
                                    "opening_odds": "1.100",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-13.5",
                                    "opening_spread": -13.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "13.5",
                                    "opening_spread": 13.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.840",
                                    "opening_odds": "1.950",
                                    "odds_trend": "down",
                                    "spread": "-13.5",
                                    "opening_spread": -15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.930",
                                    "opening_odds": "1.760",
                                    "odds_trend": "up",
                                    "spread": "13.5",
                                    "opening_spread": 15.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.840",
                                    "opening_odds": "1.950",
                                    "odds_trend": "down",
                                    "spread": "-13.5",
                                    "opening_spread": -15.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.930",
                                    "opening_odds": "1.760",
                                    "odds_trend": "up",
                                    "spread": "13.5",
                                    "opening_spread": 15.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.877",
                                    "opening_odds": "1.909",
                                    "spread": "-13.5",
                                    "opening_spread": -14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.943",
                                    "opening_odds": "1.909",
                                    "spread": "13.5",
                                    "opening_spread": 14.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.850",
                                    "opening_odds": "1.750",
                                    "odds_trend": "up",
                                    "spread": "-13.5",
                                    "opening_spread": -13.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "2.000",
                                    "odds_trend": "down",
                                    "spread": "13.5",
                                    "opening_spread": 13.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.952",
                                    "opening_odds": "1.909",
                                    "odds_trend": "down",
                                    "spread": "-14.5",
                                    "opening_spread": -14.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.870",
                                    "opening_odds": "1.909",
                                    "odds_trend": "up",
                                    "spread": "14.5",
                                    "opening_spread": 14.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500891",
            "sr_id": "sr:match:62925737",
            "srMatchId": "62925737",
            "homeTeamId": "1610612747",
            "awayTeamId": "1610612740",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.290",
                                    "opening_odds": "1.250",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.700",
                                    "opening_odds": "3.950",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.290",
                                    "opening_odds": "1.250",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.700",
                                    "opening_odds": "3.950",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.303",
                                    "opening_odds": "1.256",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.650",
                                    "opening_odds": "4.100",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.300",
                                    "opening_odds": "1.220",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.700",
                                    "opening_odds": "4.500",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "3.800",
                                    "opening_odds": "4.400",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.286",
                                    "opening_odds": "1.222",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-7.5",
                                    "opening_spread": -7.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "7.5",
                                    "opening_spread": 7.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.890",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "-8.5",
                                    "opening_spread": -9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.910",
                                    "opening_odds": "1.820",
                                    "odds_trend": "up",
                                    "spread": "8.5",
                                    "opening_spread": 9.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.890",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "-8.5",
                                    "opening_spread": -9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.910",
                                    "opening_odds": "1.820",
                                    "odds_trend": "up",
                                    "spread": "8.5",
                                    "opening_spread": 9.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.926",
                                    "opening_odds": "1.893",
                                    "odds_trend": "up",
                                    "spread": "-8.5",
                                    "opening_spread": -9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.893",
                                    "opening_odds": "1.926",
                                    "odds_trend": "down",
                                    "spread": "8.5",
                                    "opening_spread": 9.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.000",
                                    "odds_trend": "up",
                                    "spread": "-9.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.750",
                                    "opening_odds": "1.750",
                                    "odds_trend": "down",
                                    "spread": "9.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.952",
                                    "opening_odds": "1.952",
                                    "odds_trend": "up",
                                    "spread": "-8.5",
                                    "opening_spread": -10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.870",
                                    "opening_odds": "1.870",
                                    "odds_trend": "down",
                                    "spread": "8.5",
                                    "opening_spread": 10.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500892",
            "sr_id": "sr:match:62926473",
            "srMatchId": "62926473",
            "homeTeamId": "1610612758",
            "awayTeamId": "1610612756",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.500",
                                    "opening_odds": "4.100",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.200",
                                    "opening_odds": "1.240",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.500",
                                    "opening_odds": "4.100",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.200",
                                    "opening_odds": "1.240",
                                    "odds_trend": "down"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.600",
                                    "opening_odds": "4.500",
                                    "odds_trend": "down"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.217",
                                    "opening_odds": "1.222",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "4.500",
                                    "opening_odds": "4.500"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.220",
                                    "opening_odds": "1.220"
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.222",
                                    "opening_odds": "1.211",
                                    "odds_trend": "up"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "4.500",
                                    "opening_odds": "4.600",
                                    "odds_trend": "up"
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:5277",
                            "name": "Mozzartbet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "9.5",
                                    "opening_spread": 9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.900",
                                    "opening_odds": "1.900",
                                    "spread": "-9.5",
                                    "opening_spread": -9.5
                                }
                            ],
                            "url": "https://www.mozzartbet.com/sr/nba?utm_source=nba&utm_medium=mbet&utm_campaign=nba_match_schedule_mbet",
                            "countryCode": "RS"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "10.5",
                                    "opening_spread": 9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.880",
                                    "opening_odds": "1.830",
                                    "odds_trend": "down",
                                    "spread": "-10.5",
                                    "opening_spread": -9.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.870",
                                    "odds_trend": "up",
                                    "spread": "10.5",
                                    "opening_spread": 9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.880",
                                    "opening_odds": "1.830",
                                    "odds_trend": "down",
                                    "spread": "-10.5",
                                    "opening_spread": -9.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        },
                        {
                            "id": "sr:book:18186",
                            "name": "FanDuel",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "10.5",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-10.5",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://servedby.flashtalking.com/click/8/270247;9354109;369307;211;0/?ft_width=1&ft_height=1&gdpr=${GDPR}&gdpr_consent=${GDPR_CONSENT_78}&us_privacy=${US_PRIVACY}&url=41387574",
                            "countryCode": "US"
                        },
                        {
                            "id": "sr:book:35226",
                            "name": "TabAustralia",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "2.000",
                                    "opening_odds": "2.000",
                                    "spread": "9.5",
                                    "opening_spread": 9.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.750",
                                    "opening_odds": "1.750",
                                    "spread": "-9.5",
                                    "opening_spread": -9.5
                                }
                            ],
                            "url": "https://www.tab.com.au/sports/betting/Basketball/competitions/NBA",
                            "countryCode": "AU"
                        },
                        {
                            "id": "sr:book:38812",
                            "name": "SportingbetBr",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "10.5",
                                    "opening_spread": 10.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.909",
                                    "opening_odds": "1.909",
                                    "spread": "-10.5",
                                    "opening_spread": -10.5
                                }
                            ],
                            "url": "https://sports.sportingbet.bet.br/?wm=5507762&utm_source=app-nba-voa&utm_campaign=linkdabioappnba2025&utm_content={{ad.id}}&utm_medium=appnba-{{campaign.id}}_{{adset.id}}_{{ad.id}}&utm_term=5507762-linkdabioappnba2025-sptbet-sprts-br-2025-1-2-pt-app--acq-app&tdpeh=fb-{{ad.id}}{{site_source_name}}{{placement}}",
                            "countryCode": "BR"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500893",
            "sr_id": "sr:match:62924963",
            "srMatchId": "62924963",
            "homeTeamId": "1610612752",
            "awayTeamId": "1610612760",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.350",
                                    "opening_odds": "2.350"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.590",
                                    "opening_odds": "1.590"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.350",
                                    "opening_odds": "2.350"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.590",
                                    "opening_odds": "1.590"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.830",
                                    "spread": "4.5",
                                    "opening_spread": 3.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.960",
                                    "opening_odds": "1.860",
                                    "spread": "-4.5",
                                    "opening_spread": -3.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.750",
                                    "opening_odds": "1.830",
                                    "spread": "4.5",
                                    "opening_spread": 3.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.960",
                                    "opening_odds": "1.860",
                                    "spread": "-4.5",
                                    "opening_spread": -3.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500895",
            "sr_id": "sr:match:62926271",
            "srMatchId": "62926271",
            "homeTeamId": "1610612755",
            "awayTeamId": "1610612762",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.190",
                                    "opening_odds": "1.190"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "4.750",
                                    "opening_odds": "4.750"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.190",
                                    "opening_odds": "1.190"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "4.750",
                                    "opening_odds": "4.750"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.800",
                                    "opening_odds": "1.910",
                                    "spread": "-10.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.890",
                                    "opening_odds": "1.780",
                                    "spread": "10.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.800",
                                    "opening_odds": "1.910",
                                    "spread": "-10.5",
                                    "opening_spread": -11.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.890",
                                    "opening_odds": "1.780",
                                    "spread": "10.5",
                                    "opening_spread": 11.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500894",
            "sr_id": "sr:match:62926519",
            "srMatchId": "62926519",
            "homeTeamId": "1610612738",
            "awayTeamId": "1610612766",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.380",
                                    "opening_odds": "1.380"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.050",
                                    "opening_odds": "3.050"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.380",
                                    "opening_odds": "1.380"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "3.050",
                                    "opening_odds": "3.050"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.820",
                                    "opening_odds": "1.820",
                                    "spread": "-6.5",
                                    "opening_spread": -6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.880",
                                    "opening_odds": "1.880",
                                    "spread": "6.5",
                                    "opening_spread": 6.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.820",
                                    "opening_odds": "1.820",
                                    "spread": "-6.5",
                                    "opening_spread": -6.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.880",
                                    "opening_odds": "1.880",
                                    "spread": "6.5",
                                    "opening_spread": 6.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500896",
            "sr_id": "sr:match:62925267",
            "srMatchId": "62925267",
            "homeTeamId": "1610612763",
            "awayTeamId": "1610612757",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.600",
                                    "opening_odds": "2.600"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.500",
                                    "opening_odds": "1.500"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "2.600",
                                    "opening_odds": "2.600"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.500",
                                    "opening_odds": "1.500"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.910",
                                    "opening_odds": "1.910",
                                    "spread": "4.5",
                                    "opening_spread": 4.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.790",
                                    "opening_odds": "1.790",
                                    "spread": "-4.5",
                                    "opening_spread": -4.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.910",
                                    "opening_odds": "1.910",
                                    "spread": "4.5",
                                    "opening_spread": 4.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.790",
                                    "opening_odds": "1.790",
                                    "spread": "-4.5",
                                    "opening_spread": -4.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                }
            ]
        },
        {
            "gameId": "0022500897",
            "sr_id": "sr:match:62926365",
            "srMatchId": "62926365",
            "homeTeamId": "1610612749",
            "awayTeamId": "1610612737",
            "markets": [
                {
                    "name": "2way",
                    "odds_type_id": 1,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.880"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.920"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 1,
                                    "type": "home",
                                    "odds": "1.880",
                                    "opening_odds": "1.880"
                                },
                                {
                                    "odds_field_id": 2,
                                    "type": "away",
                                    "odds": "1.920",
                                    "opening_odds": "1.920"
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                },
                {
                    "name": "spread",
                    "odds_type_id": 4,
                    "group_name": "regular",
                    "books": [
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.910",
                                    "opening_odds": "1.910",
                                    "spread": "-1.5",
                                    "opening_spread": -1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.790",
                                    "opening_odds": "1.790",
                                    "spread": "1.5",
                                    "opening_spread": 1.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "GR"
                        },
                        {
                            "id": "sr:book:6565",
                            "name": "Novibet",
                            "outcomes": [
                                {
                                    "odds_field_id": 10,
                                    "type": "home",
                                    "odds": "1.910",
                                    "opening_odds": "1.910",
                                    "spread": "-1.5",
                                    "opening_spread": -1.5
                                },
                                {
                                    "odds_field_id": 12,
                                    "type": "away",
                                    "odds": "1.790",
                                    "opening_odds": "1.790",
                                    "spread": "1.5",
                                    "opening_spread": 1.5
                                }
                            ],
                            "url": "https://www.novibet.gr/stoixima/mpasket/4372811/united-states/nba/5142827?btag=20045[â€¦]ce=2004578_&utm_medium=affiliate&utm_campaign=STOIXIMAGENERIC",
                            "countryCode": "CY"
                        }
                    ]
                }
            ]
        }
    ]
}
*/