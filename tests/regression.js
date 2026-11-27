(() => {
    const frame = document.getElementById("appFrame");
    const runButton = document.getElementById("runTests");
    const summary = document.getElementById("summary");
    const results = document.getElementById("results");
    const app = () => frame.contentWindow;

    let appReady = false;
    function initializeTestFrame() {
        if (appReady) return;
        appReady = true;
        app().eval(`
            window.__regression = {
                reset(teamCount) {
                    state = createInitialState(
                        "Regression QA",
                        Array.from({ length: teamCount }, (_, index) => "QA Club " + (index + 1))
                    );
                    state.standings.forEach(team => {
                        const peers = state.standings
                            .filter(candidate => candidate.divisionId === team.divisionId)
                            .sort((a, b) => a.id - b.id);
                        const rank = peers.findIndex(candidate => candidate.id === team.id);
                        team.pts = (peers.length - rank) * 3;
                        team.gf = peers.length * 2 - rank;
                        team.ga = rank;
                    });
                    activeView = "overview";
                    activeDivisionId = 1;
                    selectedTeamId = null;
                    clubViewHistory = [];
                    selectedArchiveSeason = null;
                    selectedArchiveDivisionId = 1;
                    selectedArchiveClubId = null;
                    archiveMatchPage = 1;
                    playerLeaderboardCategory = "goals";
                    playerLeaderboardDivisionId = "all";
                    playerLeaderboardPage = 1;
                    saveState = function () {};
                    window.confirm = function () { return true; };
                    return true;
                },
                completeSeason() {
                    state.fixtures.forEach(match => { match.played = true; });
                    state.divisions.forEach(division => {
                        const weeks = state.fixtures
                            .filter(match => match.divisionId === division.id)
                            .map(match => match.week);
                        state.divisionProgress[division.id] = Math.max(0, ...weeks) + 1;
                    });
                },
                transition(teamCount, rules) {
                    window.__regression.reset(teamCount);
                    state.rules.divisionMovements = rules;
                    state.matchLog = [{
                        week: 1,
                        divisionId: 1,
                        homeId: 1,
                        awayId: 2,
                        homeShort: state.standings[0].short,
                        awayShort: state.standings[1].short,
                        homeGoals: 2,
                        awayGoals: 1,
                        stats: {
                            possessionHome: 55,
                            possessionAway: 45,
                            shotsHome: 8,
                            shotsAway: 5,
                            xgHome: 1.2,
                            xgAway: 0.7
                        }
                    }];
                    state.standings[0].squad[0].appearances = 1;
                    state.standings[0].squad[0].goals = 1;
                    state.standings[0].squad[0].assists = 1;
                    state.standings[0].squad[0].cleanSheets = 1;
                    const validationError = validateDivisionMovementRules(
                        rules,
                        getDivisionSizes(state.standings),
                        state.standings
                    );
                    if (validationError) return { error: validationError };
                    const plan = createPromotionAndRelegationPlan(rules);
                    const planError = validateMovementPlan(
                        plan.movements,
                        state.divisions,
                        state.standings
                    );
                    if (planError) return { error: planError };

                    const beforeSizes = getDivisionSizes(state.standings);
                    const originalSeason = state.season;
                    state.pendingSeasonTransition = {
                        season: state.season,
                        movements: plan.movements,
                        playoffs: plan.playoffs
                    };
                    state.lastMovements = plan.movements;
                    state.lastPlayoffs = plan.playoffs;
                    state.playoffHistory.push(...plan.playoffs);
                    window.__regression.completeSeason();
                    startNextSeason();

                    return {
                        seasonAdvanced: state.season !== originalSeason,
                        divisionsBalanced: JSON.stringify(beforeSizes) === JSON.stringify(getDivisionSizes(state.standings)),
                        standingsReset: state.standings.every(team =>
                            team.p === 0 && team.w === 0 && team.d === 0 && team.l === 0 &&
                            team.gf === 0 && team.ga === 0 && team.pts === 0
                        ),
                        ranksInitialized: state.standings.every(team => Number.isFinite(team.previousDivisionRank)),
                        transitionCleared: state.pendingSeasonTransition === null,
                        archiveSaved: state.seasonHistory.length === 1 &&
                            state.seasonHistory[0].season === originalSeason &&
                            state.seasonHistory[0].champion?.id === state.seasonHistory[0].divisions[0].standings[0].id &&
                            state.seasonHistory[0].divisions.every(division =>
                                division.champion?.id === division.standings[0]?.id
                            ),
                        movementAndPlayoffHistoryArchived: state.seasonHistory[0].movements.length === plan.movements.length &&
                            state.seasonHistory[0].playoffs.length === plan.playoffs.length,
                        matchStatsArchived: state.seasonHistory[0]?.matches[0]?.stats?.xgHome === 1.2,
                        playerStatsArchived: state.seasonHistory[0]?.players.some(player =>
                            player.teamId === 1 && player.appearances === 1 && player.goals === 1 &&
                            player.assists === 1 && player.cleanSheets === 1
                        ),
                        playerStatsReset: state.standings.every(team => team.squad.every(player =>
                            player.appearances === 0 && player.goals === 0 &&
                            player.assists === 0 && player.cleanSheets === 0 &&
                            player.yellowCards === 0 && player.redCards === 0
                        )),
                        playoffs: plan.playoffs.length,
                        sizes: getDivisionSizes(state.standings)
                    };
                }
            };
        `);
        runButton.disabled = false;
        runButton.textContent = "Jalankan semua tes";
        summary.textContent = "Aplikasi tes siap. Save game pengguna tidak dimuat.";
    }

    frame.addEventListener("load", initializeTestFrame);
    if (frame.contentDocument?.readyState === "complete") initializeTestFrame();

    function assert(condition, message) {
        if (!condition) throw new Error(message);
    }

    function inApp(expression) {
        return app().eval(expression);
    }

    async function runTest(name, test) {
        const item = document.createElement("li");
        try {
            await test();
            item.className = "passed";
            item.textContent = `LULUS — ${name}`;
            return true;
        } catch (error) {
            item.className = "failed";
            item.textContent = `GAGAL — ${name}: ${error.message}`;
            return false;
        } finally {
            results.appendChild(item);
        }
    }

    async function runAllTests() {
        runButton.disabled = true;
        results.replaceChildren();
        let passed = 0;
        let failed = 0;
        const tests = [
            ["Database nama pemain terpisah digunakan", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    const database = window.PLAYER_NAME_DATABASE;
                    const existingNames = state.standings
                        .flatMap(team => team.squad)
                        .every(player =>
                            database.firstNames.includes(player.name.split(" ")[0]) &&
                            database.lastNames.some(lastName => player.name.includes(lastName))
                        );
                    const generated = createGeneratedPlayer(state.standings[0], "ST");
                    const generatedNameUsesDatabase =
                        database.firstNames.some(firstName => generated.name.startsWith(firstName + " ")) &&
                        database.lastNames.some(lastName => generated.name.includes(lastName));
                    return database.firstNames.length > 0 && database.lastNames.length > 0 &&
                        existingNames && generatedNameUsesDatabase;
                })()`);
                assert(result, "Data nama pemain tidak dimuat atau tidak dipakai saat membuat skuad.");
            }],
            ["Aturan default dan liga 21 tim", () => {
                const outcome = inApp(`(() => {
                    window.__regression.reset(21);
                    return {
                        sizes: getDivisionSizes(state.standings),
                        valid: !validateDivisionMovementRules(
                            state.rules.divisionMovements,
                            getDivisionSizes(state.standings),
                            state.standings
                        )
                    };
                })()`);
                assert(outcome.valid && outcome.sizes["1"] === 20 && outcome.sizes["2"] === 1,
                    "Aturan default liga 21 tim tidak valid atau pembagian kastanya berubah.");
            }],
            ["Satu simulasi pekan memajukan semua kasta", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(25);
                    const buttonIsGlobal = renderOverview().includes(
                        "Simulasikan Pekan Berikutnya · Semua Kasta"
                    );
                    simulateWeek();
                    const everyDivisionAdvanced = state.divisions.every(division =>
                        state.divisionProgress[division.id] === 2);
                    const matchesInEveryDivision = state.divisions.every(division =>
                        state.matchLog.some(match => match.divisionId === division.id));
                    const weeklyFinancesProcessed = state.standings.every(team =>
                        team.finance.lastWeek !== null);
                    return {
                        buttonIsGlobal,
                        everyDivisionAdvanced,
                        matchesInEveryDivision,
                        weeklyFinancesProcessed,
                        federationIncomeAppliedOnce: state.federationBudget === 12380
                    };
                })()`);
                assert(Object.values(result).every(Boolean),
                    "Simulasi lintas kasta tidak berjalan serempak: " + JSON.stringify(result));
            }],
            ["Siklus rollover untuk semua mode dan beberapa divisi", () => {
                const rules = rule => [rule];
                const cases = [
                    {
                        teams: 25,
                        rules: rules({ upperDivisionId: 1, lowerDivisionId: 2, mode: "auto", promotedCount: 2, relegatedCount: 2, playoffSpots: 0, crossPlayoffPosition: 3 }),
                        expectedPlayoffs: 0
                    },
                    {
                        teams: 35,
                        rules: rules({ upperDivisionId: 1, lowerDivisionId: 2, mode: "internal_playoff", promotedCount: 2, relegatedCount: 3, playoffSpots: 4, crossPlayoffPosition: 3 }),
                        expectedPlayoffs: 3
                    },
                    {
                        teams: 25,
                        rules: rules({ upperDivisionId: 1, lowerDivisionId: 2, mode: "cross_playoff", promotedCount: 2, relegatedCount: 2, playoffSpots: 0, crossPlayoffPosition: 3 }),
                        expectedPlayoffs: 1
                    },
                    {
                        teams: 25,
                        rules: rules({ upperDivisionId: 1, lowerDivisionId: 2, mode: "auto", promotedCount: 0, relegatedCount: 0, playoffSpots: 0, crossPlayoffPosition: 3 }),
                        expectedPlayoffs: 0
                    },
                    {
                        teams: 45,
                        rules: [
                            { upperDivisionId: 1, lowerDivisionId: 2, mode: "internal_playoff", promotedCount: 2, relegatedCount: 3, playoffSpots: 4, crossPlayoffPosition: 3 },
                            { upperDivisionId: 2, lowerDivisionId: 3, mode: "cross_playoff", promotedCount: 2, relegatedCount: 2, playoffSpots: 0, crossPlayoffPosition: 3 }
                        ],
                        expectedPlayoffs: 4
                    }
                ];
                cases.forEach(testCase => {
                    const result = inApp(`window.__regression.transition(${testCase.teams}, ${JSON.stringify(testCase.rules)})`);
                    assert(!result.error, result.error || "Perencanaan perpindahan gagal.");
                    assert(result.seasonAdvanced && result.divisionsBalanced && result.standingsReset &&
                        result.ranksInitialized && result.transitionCleared && result.archiveSaved &&
                        result.movementAndPlayoffHistoryArchived && result.matchStatsArchived &&
                        result.playerStatsArchived && result.playerStatsReset,
                        `Rollover gagal untuk liga ${testCase.teams} tim.`);
                    assert(result.playoffs === testCase.expectedPlayoffs,
                        `Jumlah play-off tidak sesuai untuk liga ${testCase.teams} tim.`);
                });
            }],
            ["Hasil play-off tidak meluap pada layar ponsel", () => {
                const originalWidth = frame.style.width;
                try {
                    frame.style.width = "390px";
                    const result = inApp(`(() => {
                        const card = document.createElement("article");
                        card.className = "playoff-history-card";
                        card.innerHTML = '<div class="playoff-history-heading"><strong>Ignis Dynamo vs Solaris Athletic</strong></div>' +
                            '<div class="playoff-leg-scores"><span>Adu penalti (Ignis Dynamo — Solaris Athletic): 3/5 — 5/5</span></div>' +
                            '<div class="playoff-result"><span>Pemenang: Solaris Athletic</span></div>';
                        document.body.appendChild(card);
                        const columns = getComputedStyle(card).gridTemplateColumns;
                        const alignment = getComputedStyle(card.querySelector(".playoff-result")).textAlign;
                        const fits = card.scrollWidth <= card.clientWidth;
                        card.remove();
                        return {
                            mobileViewport: window.innerWidth <= 620,
                            singleColumn: columns.trim().split(/\\s+/).length === 1,
                            leftAligned: alignment === "left",
                            contentFits: fits
                        };
                    })()`);
                    assert(result.mobileViewport && result.singleColumn &&
                        result.leftAligned && result.contentFits,
                        "Kartu play-off masih memakai grid desktop atau teksnya terpotong di layar ponsel.");
                } finally {
                    frame.style.width = originalWidth;
                }
            }],
            ["Konfigurasi dan kandidat bentrok ditolak tanpa simulasi", () => {
                const invalidConfig = inApp(`(() => {
                    window.__regression.reset(25);
                    state.rules.divisionMovements = [{
                        upperDivisionId: 1, lowerDivisionId: 2, mode: "auto",
                        promotedCount: 2, relegatedCount: 1, playoffSpots: 0, crossPlayoffPosition: 3
                    }];
                    window.__regression.completeSeason();
                    const before = JSON.stringify(state.standings);
                    processSeasonEnd();
                    return {
                        rejected: !state.pendingSeasonTransition,
                        unchanged: before === JSON.stringify(state.standings)
                    };
                })()`);
                assert(invalidConfig.rejected && invalidConfig.unchanged,
                    "Aturan tidak seimbang tidak ditolak sebelum simulasi.");

                const collision = inApp(`(() => {
                    window.__regression.reset(55);
                    const rules = [
                        { upperDivisionId: 1, lowerDivisionId: 2, mode: "internal_playoff", promotedCount: 4, relegatedCount: 5, playoffSpots: 8, crossPlayoffPosition: 3 },
                        { upperDivisionId: 2, lowerDivisionId: 3, mode: "cross_playoff", promotedCount: 8, relegatedCount: 8, playoffSpots: 0, crossPlayoffPosition: 14 }
                    ];
                    return validateDivisionMovementRules(rules, getDivisionSizes(state.standings), state.standings);
                })()`);
                assert(String(collision).includes("memakai klub yang sama"),
                    "Klub kandidat yang sama pada dua batas kasta tidak terdeteksi.");
            }],
            ["Save/load pending dan migrasi save lama", () => {
                const result = inApp(`(() => {
                    const values = Object.create(null);
                    Object.defineProperty(window, "localStorage", {
                        configurable: true,
                        value: {
                            getItem(key) { return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : null; },
                            setItem(key, value) { values[key] = String(value); },
                            removeItem(key) { delete values[key]; }
                        }
                    });
                    const oldState = createInitialState(
                        "Legacy QA",
                        Array.from({ length: 25 }, (_, index) => "Old Club " + index)
                    );
                    oldState.version = 2;
                    delete oldState.seasonHistory;
                    delete oldState.rules.salaryCap;
                    delete oldState.rules.prizePool;
                    delete oldState.federationBudget;
                    oldState.pendingSeasonTransition = { season: oldState.season, movements: [], playoffs: [] };
                    oldState.standings.forEach(team => {
                        delete team.nextPlayerSequence;
                        delete team.sponsorIncome;
                        delete team.finance;
                        team.squad.forEach(player => {
                            delete player.age;
                            delete player.potential;
                            delete player.retirementAge;
                            delete player.lastSeasonChange;
                            delete player.weeklyWage;
                            delete player.assists;
                            delete player.cleanSheets;
                        });
                    });
                    values["aosb-league-save-v2"] = JSON.stringify(oldState);
                    const loaded = loadState();
                    return {
                        upgraded: loaded.version === 3 && !!values["aosb-league-save-v3"],
                        pendingPreserved: !!loaded.pendingSeasonTransition,
                        archiveDefaulted: Array.isArray(loaded.seasonHistory) && loaded.seasonHistory.length === 0,
                        financeDefaultsAdded: loaded.rules.salaryCap === 800 &&
                            loaded.rules.prizePool === 5000 && loaded.federationBudget === 12000 &&
                            loaded.standings.every(team =>
                                Number.isFinite(team.sponsorIncome) &&
                                team.finance.season === loaded.season &&
                                team.squad.every(player => Number.isFinite(player.weeklyWage))
                            ),
                        careerDataAdded: loaded.standings.every(team =>
                            Number.isFinite(team.nextPlayerSequence) &&
                            team.squad.every(player =>
                                player.age >= 18 && player.potential >= player.rating &&
                                player.retirementAge > player.age &&
                                player.assists === 0 && player.cleanSheets === 0
                            )
                        )
                    };
                })()`);
                assert(result.upgraded && result.pendingPreserved && result.archiveDefaulted &&
                    result.financeDefaultsAdded && result.careerDataAdded,
                    "Save lama atau fase akhir musim pending tidak dimuat dengan benar.");
            }],
            ["Sponsor, tiket, gaji, dan saldo klub dihitung per pekan", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    const home = state.standings[0];
                    const away = state.standings[1];
                    home.fans = 80;
                    away.fans = 60;
                    home.budget = 1000;
                    away.budget = 1000;
                    state.standings.forEach(team => team.squad.forEach(player => {
                        player.weeklyWage = 20;
                    }));
                    const homeSponsor = calculateWeeklySponsorIncome(home);
                    const awaySponsor = calculateWeeklySponsorIncome(away);
                    const payroll = getTeamWeeklyPayroll(home);
                    const reports = processClubWeeklyFinances(1, [{
                        homeId: home.id,
                        awayId: away.id
                    }]);
                    selectedTeamId = home.id;
                    const financeMarkup = renderClubDetail();
                    return home.budget === 1000 + homeSponsor + 1200 - payroll &&
                        away.budget === 1000 + awaySponsor - payroll &&
                        home.finance.lastWeek.ticketIncome === 1200 &&
                        away.finance.lastWeek.ticketIncome === 0 &&
                        home.finance.salaryExpenses === payroll &&
                        home.finance.sponsorIncome === homeSponsor &&
                        reports.length === 10 &&
                        financeMarkup.includes("Keuangan Klub") &&
                        financeMarkup.includes("Gaji skuad / pekan");
                })()`);
                assert(result, "Pemasukan mingguan atau gaji klub tidak tercatat dengan benar.");
            }],
            ["Pengaturan batas gaji dan prize pool tervalidasi", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    setView("regulations");
                    document.getElementById("salaryCap").value = "900";
                    document.getElementById("prizePool").value = "7500";
                    document.getElementById("saveRules").click();
                    const saved = state.rules.salaryCap === 900 && state.rules.prizePool === 7500;
                    document.getElementById("salaryCap").value = "10001";
                    document.getElementById("prizePool").value = "1000001";
                    document.getElementById("saveRules").click();
                    return saved && state.rules.salaryCap === 900 && state.rules.prizePool === 7500;
                })()`);
                assert(result, "Pengaturan keuangan tidak tersimpan atau nilai di luar batas diterima.");
            }],
            ["Prize pool bertingkat, batas kas federasi, dan arsip hadiah", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(25);
                    state.rules.prizePool = 10000;
                    state.federationBudget = 20000;
                    state.divisions.forEach(division => {
                        const teams = state.standings
                            .filter(team => team.divisionId === division.id)
                            .sort((a, b) => a.id - b.id);
                        teams.forEach((team, index) => {
                            team.p = teams.length - index;
                            team.gf = teams.length - index;
                        });
                    });
                    const topChampion = state.standings.find(team => team.id === 1);
                    const lowerChampion = state.standings.find(team => team.id === 21);
                    const topBudget = topChampion.budget;
                    const lowerBudget = lowerChampion.budget;
                    const report = processLeaguePrizePool();
                    const topDivision = report.divisions.find(division => division.divisionId === 1);
                    const lowerDivision = report.divisions.find(division => division.divisionId === 2);
                    const tierAndAwardsWork = topDivision.requestedPool === 10000 &&
                        lowerDivision.requestedPool === 6000 &&
                        topDivision.awards[0].amount === 4000 &&
                        topDivision.awards[1].amount === 2500 &&
                        lowerDivision.awards[0].amount === 2400 &&
                        topChampion.budget === topBudget + 4000 &&
                        lowerChampion.budget === lowerBudget + 2400 &&
                        report.funded && state.federationBudget === 4000;
                    state.federationBudget = 1000;
                    const limitedReport = processLeaguePrizePool();
                    const fundingLimitWorks = !limitedReport.funded &&
                        limitedReport.fundedTotal === 1000 && state.federationBudget === 0;

                    window.__regression.reset(25);
                    state.rules.prizePool = 1000;
                    state.federationBudget = 20000;
                    state.pendingSeasonTransition = {
                        season: state.season,
                        movements: [],
                        playoffs: []
                    };
                    window.__regression.completeSeason();
                    const archivedSeason = state.season;
                    startNextSeason();
                    const archive = state.seasonHistory.find(item => item.season === archivedSeason);
                    const archivedFinance = archive.clubFinances.find(item => item.teamId === 1);
                    const archivedPrize = archive.prizePool.divisions.find(
                        division => division.divisionId === 1
                    );
                    selectedArchiveSeason = archivedSeason;
                    selectedArchiveDivisionId = 1;
                    const archiveWorks = archivedPrize.awards.length === 5 &&
                        archivedFinance.prizeMoney > 0 &&
                        archive.divisions[0].standings[0].budget === archivedFinance.closingBudget &&
                        renderSeasonArchive().includes("Keuangan Klub") &&
                        renderSeasonArchive().includes("Prize Pool");
                    return { tierAndAwardsWork, fundingLimitWorks, archiveWorks };
                })()`);
                assert(Object.values(result).every(Boolean),
                    "Hadiah tidak sesuai tingkat kasta, kemampuan kas, atau arsip: " + JSON.stringify(result));
            }],
            ["Arsip multi-musim dan filter tampilan", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    const firstSeason = state.season;
                    state.standings[0].squad[0].appearances = 2;
                    state.standings[0].squad[0].goals = 1;
                    state.standings[0].squad[0].assists = 2;
                    state.standings[0].squad[0].cleanSheets = 1;
                    state.matchLog = [{
                        week: 1, divisionId: 1, homeId: 1, awayId: 2,
                        homeShort: state.standings[0].short, awayShort: state.standings[1].short,
                        homeGoals: 1, awayGoals: 0,
                        stats: { possessionHome: 52, possessionAway: 48, shotsHome: 6, shotsAway: 3, xgHome: 0.9, xgAway: 0.4 }
                    }];
                    state.pendingSeasonTransition = { season: state.season, movements: [], playoffs: [] };
                    window.__regression.completeSeason();
                    startNextSeason();

                    const firstArchiveHasData = state.seasonHistory[0].players[0].goals === 1 &&
                        state.seasonHistory[0].players[0].assists === 2 &&
                        state.seasonHistory[0].players[0].cleanSheets === 1 &&
                        state.seasonHistory[0].matches[0].stats.xgHome === 0.9;
                    const secondSeason = state.season;
                    state.standings[0].squad[0].appearances = 3;
                    state.standings[0].squad[0].goals = 2;
                    state.standings[0].squad[0].assists = 3;
                    state.standings[0].squad[0].cleanSheets = 2;
                    state.matchLog = [{
                        week: 2, divisionId: 1, homeId: 2, awayId: 1,
                        homeShort: state.standings[1].short, awayShort: state.standings[0].short,
                        homeGoals: 0, awayGoals: 2,
                        stats: { possessionHome: 41, possessionAway: 59, shotsHome: 2, shotsAway: 9, xgHome: 0.3, xgAway: 1.6 }
                    }];
                    state.pendingSeasonTransition = { season: state.season, movements: [], playoffs: [] };
                    window.__regression.completeSeason();
                    startNextSeason();
                    state.seasonHistory[1].matches = Array.from({ length: 26 }, (_, index) => ({
                        ...state.seasonHistory[1].matches[0],
                        week: index + 1
                    }));
                    setView("archive");
                    const latestSelected = selectedArchiveSeason === secondSeason &&
                        document.querySelectorAll("#archiveSeasonSelect option").length === 2;
                    const secondArchiveHasData = state.seasonHistory[1].season === secondSeason &&
                        state.seasonHistory[1].players.some(player =>
                            player.teamId === 1 && player.goals === 2 && player.assists === 3 &&
                            player.cleanSheets === 2
                        ) &&
                        state.standings[0].squad[0].goals === 0 &&
                        state.standings[0].squad[0].assists === 0 &&
                        state.standings[0].squad[0].cleanSheets === 0;
                    const firstPageCount = document.querySelectorAll(".archive-match-row").length;
                    document.getElementById("archiveMatchesNext").click();
                    const secondPageCount = document.querySelectorAll(".archive-match-row").length;
                    const firstSeasonOption = document.getElementById("archiveSeasonSelect");
                    firstSeasonOption.value = firstSeason;
                    firstSeasonOption.dispatchEvent(new Event("change"));
                    localStorage.setItem("aosb-league-save-v3", JSON.stringify(state));
                    const loaded = loadState();
                    const archiveSurvivesSaveLoad = loaded.seasonHistory.length === 2 &&
                        loaded.seasonHistory[0].matches.length === 1 &&
                        loaded.seasonHistory[1].players.some(player => player.goals === 2);
                    return firstArchiveHasData && latestSelected && secondArchiveHasData &&
                        firstPageCount === 25 && secondPageCount === 1 &&
                        selectedArchiveSeason === firstSeason &&
                        document.getElementById("seasonLabel").textContent.includes(firstSeason) &&
                        document.querySelectorAll(".archive-match-row").length === 1 &&
                        archiveSurvivesSaveLoad;
                })()`);
                assert(result, "Arsip musim tidak menyimpan atau menampilkan data lintas musim dengan benar.");
            }],
            ["Arsip menampilkan juara dan ringkasan kasta terpilih", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(25);
                    const firstDivisionTeams = state.standings.filter(team => team.divisionId === 1);
                    const secondDivisionTeams = state.standings.filter(team => team.divisionId === 2);
                    state.matchLog = [
                        {
                            week: 1, divisionId: 1,
                            homeId: firstDivisionTeams[0].id, awayId: firstDivisionTeams[1].id,
                            homeShort: firstDivisionTeams[0].short, awayShort: firstDivisionTeams[1].short,
                            homeGoals: 1, awayGoals: 0
                        },
                        {
                            week: 1, divisionId: 2,
                            homeId: secondDivisionTeams[0].id, awayId: secondDivisionTeams[1].id,
                            homeShort: secondDivisionTeams[0].short, awayShort: secondDivisionTeams[1].short,
                            homeGoals: 0, awayGoals: 1
                        }
                    ];
                    const archive = archiveCurrentSeason();
                    archive.divisions[1].champion = null;
                    selectedArchiveSeason = archive.season;
                    selectedArchiveDivisionId = 2;
                    const wrapper = document.createElement("div");
                    wrapper.innerHTML = renderSeasonArchive();
                    const championCard = wrapper.querySelector(".archive-champion");
                    const championTitle = championCard.querySelector("h2").textContent;
                    const championLabel = championCard.querySelector(".eyebrow").textContent;
                    const metadata = [...championCard.querySelectorAll(".archive-champion-meta span")]
                        .map(item => item.textContent);
                    const expectedPlayers = archive.players.filter(player =>
                        secondDivisionTeams.some(team => team.id === player.teamId)).length;
                    return {
                        selectedDivisionChampion: championTitle ===
                            archive.divisions[1].standings[0].name,
                        divisionNamedInCard: championLabel.includes("Kasta 2"),
                        statsMatchSelectedDivision: metadata[0] === secondDivisionTeams.length + " klub" &&
                            metadata[1] === "1 pertandingan" &&
                            metadata[2] === expectedPlayers + " catatan pemain"
                    };
                })()`);
                assert(Object.values(result).every(Boolean),
                    "Ringkasan arsip tidak mengikuti kasta yang dipilih: " + JSON.stringify(result));
            }],
            ["Zona promosi, play-off, dan degradasi ditandai di klasemen", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(45);
                    state.rules.divisionMovements = [
                        {
                            upperDivisionId: 1, lowerDivisionId: 2, mode: "internal_playoff",
                            promotedCount: 2, relegatedCount: 3, playoffSpots: 4, crossPlayoffPosition: 3
                        },
                        {
                            upperDivisionId: 2, lowerDivisionId: 3, mode: "cross_playoff",
                            promotedCount: 2, relegatedCount: 2, playoffSpots: 0, crossPlayoffPosition: 3
                        }
                    ];
                    [1, 2, 3].forEach(divisionId => {
                        const teams = state.standings.filter(team => team.divisionId === divisionId);
                        teams.forEach((team, index) => {
                            team.pts = teams.length - index;
                            team.gf = 0;
                            team.ga = 0;
                        });
                    });
                    activeDivisionId = 2;
                    const middle = document.createElement("div");
                    middle.innerHTML = renderBroadcastTable(sortedStandings());
                    const middleRows = [...middle.querySelectorAll(".broadcast-row")];
                    const legend = middle.querySelector(".table-legend").textContent;
                    const middleZones = middleRows.slice(0, 2).every(row => row.classList.contains("promotion")) &&
                        middleRows.slice(2, 6).every(row => row.classList.contains("playoff")) &&
                        middleRows[17].classList.contains("playoff") &&
                        middleRows.slice(-2).every(row => row.classList.contains("relegation"));
                    const legendComplete = legend.includes("Zona promosi") &&
                        legend.includes("Zona play-off promosi") &&
                        legend.includes("Zona degradasi");
                    activeDivisionId = 3;
                    const lower = document.createElement("div");
                    lower.innerHTML = renderBroadcastTable(sortedStandings());
                    const lowerRows = [...lower.querySelectorAll(".broadcast-row")];
                    return middleZones && legendComplete &&
                        lowerRows[2].classList.contains("playoff");
                })()`);
                assert(result, "Zona peserta play-off promosi tidak terlihat di kasta terkait.");
            }],
            ["Ringkasan menampilkan lima pemain teratas per kategori", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(25);
                    const players = state.standings.flatMap(team => team.squad);
                    players.slice(0, 7).forEach((player, index) => { player.goals = 9 - index; });
                    players.slice(7, 10).forEach((player, index) => { player.assists = 3 - index; });
                    const goalkeepers = players.filter(player => player.role === "GK").slice(0, 6);
                    goalkeepers.forEach((player, index) => { player.cleanSheets = 10 - index; });
                    const outfieldKeeperRecord = players.find(player => player.role === "CB");
                    outfieldKeeperRecord.cleanSheets = 99;

                    const container = document.createElement("div");
                    container.innerHTML = renderOverviewPlayerLeaderboards();
                    const rowsFor = category => [
                        ...container.querySelectorAll('[data-category="' + category + '"] .overview-leaderboard-row')
                    ];
                    const goals = rowsFor("goals");
                    const assists = rowsFor("assists");
                    const cleanSheets = rowsFor("cleanSheets");
                    const allShowPositiveStats = [goals, assists, cleanSheets].every(rows =>
                        rows.every(row => Number(row.querySelector(".overview-leaderboard-value").textContent) > 0)
                    );
                    const topFiveLimits = goals.length === 5 && assists.length === 3 && cleanSheets.length === 5;
                    const goalkeepersOnly = cleanSheets.every(row =>
                        row.dataset.playerRole === "GK" && row.dataset.playerId !== outfieldKeeperRecord.id
                    );
                    const goalsOrdered = goals.every((row, index) =>
                        index === 0 || Number(row.querySelector(".overview-leaderboard-value").textContent) <=
                            Number(goals[index - 1].querySelector(".overview-leaderboard-value").textContent)
                    );
                    const overview = document.createElement("div");
                    overview.innerHTML = renderOverview();
                    const sideStack = overview.querySelector(".overview-side-stack");
                    const latestBeforeLeaders = sideStack &&
                        sideStack.children[0]?.classList.contains("overview-latest-results") &&
                        sideStack.children[1]?.classList.contains("overview-player-leaders");
                    return allShowPositiveStats && topFiveLimits && goalkeepersOnly &&
                        goalsOrdered && latestBeforeLeaders;
                })()`);
                assert(result, "Leaderboard tidak berurutan tepat di bawah hasil terbaru atau datanya salah.");
            }],
            ["Penantang lintas kasta ditentukan otomatis dari promosi dan degradasi", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(40);
                    editorMode = "new";
                    editorLeagueName = "Regression QA";
                    editorDraft = state.standings.map(team => ({ id: team.id, name: team.name }));
                    movementDraft = [{
                        upperDivisionId: 1,
                        lowerDivisionId: 2,
                        mode: "cross_playoff",
                        promotedCount: 2,
                        relegatedCount: 2,
                        playoffSpots: 0,
                        crossPlayoffPosition: 99
                    }];
                    renderSetup();

                    let card = document.querySelector(".movement-rule-card");
                    const initialExplanation = card.querySelector(".movement-rule-explanation").textContent.toLocaleLowerCase();
                    const hasManualChallengerInput = !!card.querySelector(".movement-cross");
                    card.querySelector(".movement-promoted").value = "3";
                    card.querySelector(".movement-promoted").dispatchEvent(new Event("input", { bubbles: true }));
                    const updatedExplanation = card.querySelector(".movement-rule-explanation").textContent.toLocaleLowerCase();

                    const unbalancedCountsRejected = card.querySelector(".movement-rule-validation").classList.contains("invalid");
                    card.querySelector(".movement-relegated").value = "3";
                    card.querySelector(".movement-relegated").dispatchEvent(new Event("input", { bubbles: true }));
                    card.querySelector(".movement-promoted").value = "2";
                    card.querySelector(".movement-promoted").dispatchEvent(new Event("input", { bubbles: true }));
                    const modeSelect = card.querySelector(".movement-mode");
                    modeSelect.value = "internal_playoff";
                    modeSelect.dispatchEvent(new Event("change", { bubbles: true }));

                    card = document.querySelector(".movement-rule-card");
                    return !hasManualChallengerInput &&
                        initialExplanation.includes("peringkat ke-3 dari atas") &&
                        updatedExplanation.includes("peringkat ke-4 dari atas") &&
                        unbalancedCountsRejected &&
                        card.querySelector(".movement-promoted").value === "2" &&
                        card.querySelector(".movement-relegated").value === "3" &&
                        card.querySelector(".movement-playoff").value === "2" &&
                        card.querySelector(".movement-rule-explanation").textContent.toLocaleLowerCase().includes("peringkat 3–4 kasta 2") &&
                        card.querySelector(".movement-rule-validation").classList.contains("valid");
                })()`);
                assert(result, "Penjelasan tidak mengikuti mode dan nilai yang dimasukkan pengguna.");
            }],
            ["Perkembangan pemain menghargai performa dan melampaui potensi lunak", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(20);
                    state.standings.forEach(club => club.squad.forEach(player => {
                        player.age = 20;
                        player.retirementAge = 50;
                        player.potential = player.rating;
                        player.appearances = 0;
                        player.goals = 0;
                        player.assists = 0;
                        player.cleanSheets = 0;
                        player.yellowCards = 0;
                        player.redCards = 0;
                    }));
                    const team = state.standings[0];
                    team.p = 30;
                    const goalLeader = team.squad.find(player => player.role === "ST");
                    goalLeader.rating = 70;
                    goalLeader.potential = 70;
                    goalLeader.appearances = 28;
                    goalLeader.goals = 18;
                    goalLeader.assists = 8;

                    const assistLeader = team.squad.find(player => player.role === "CM");
                    assistLeader.rating = 70;
                    assistLeader.potential = 70;
                    assistLeader.appearances = 28;
                    assistLeader.assists = 16;

                    const keeperLeader = team.squad.find(player => player.role === "GK");
                    keeperLeader.rating = 70;
                    keeperLeader.potential = 70;
                    keeperLeader.appearances = 28;
                    keeperLeader.cleanSheets = 18;

                    const underperformer = team.squad.find(player => player.role === "CB");
                    underperformer.age = 32;
                    underperformer.rating = 1;
                    underperformer.potential = 1;
                    underperformer.appearances = 28;
                    underperformer.yellowCards = 20;
                    underperformer.redCards = 20;

                    const overperformer = team.squad.find(player =>
                        player.role === "CB" && player.id !== underperformer.id);
                    overperformer.rating = 98;
                    overperformer.potential = 90;
                    overperformer.appearances = 28;
                    overperformer.cleanSheets = 18;

                    const reserve = team.squad.find(player => player.role === "RW");
                    reserve.rating = 70;
                    reserve.potential = 70;
                    const previousRatings = new Map(team.squad.map(player => [player.id, player.rating]));
                    const report = processPlayerSeasonLifecycle();
                    state.lastPlayerLifecycle = report;
                    const club = report.clubs[0];
                    const growthFor = player => club.growth.find(entry => entry.name === player.name);
                    const goalGrowth = growthFor(goalLeader);
                    const assistGrowth = growthFor(assistLeader);
                    const keeperGrowth = growthFor(keeperLeader);
                    const decline = club.declines.find(entry => entry.name === underperformer.name);
                    const summary = renderPlayerLifecycleSummary(1);
                    return !!goalGrowth && !!assistGrowth && !!keeperGrowth && !!decline &&
                        goalLeader.rating > previousRatings.get(goalLeader.id) &&
                        goalLeader.rating > goalLeader.potential &&
                        goalLeader.rating - previousRatings.get(goalLeader.id) >= 4 &&
                        goalLeader.rating - previousRatings.get(goalLeader.id) >
                            reserve.rating - previousRatings.get(reserve.id) &&
                        overperformer.rating === 100 &&
                        underperformer.rating === 0 &&
                        decline.to < decline.from &&
                        goalGrowth.reason.includes("pencetak gol terbanyak") &&
                        assistGrowth.reason.includes("assist terbanyak") &&
                        keeperGrowth.reason.includes("clean sheet terbanyak") &&
                        summary.includes(goalGrowth.reason) &&
                        team.squad.every(player => player.rating >= 0 && player.rating <= 100);
                })()`);
                assert(result, "Performa, statistik posisi, potensi lunak, atau OVR 0–100 tidak diterapkan.");
            }],
            ["Lineup AI, rotasi kebugaran, dan laporan arsip", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    const team = state.standings[0];
                    const opponent = state.standings[1];
                    team.squad.forEach(player => {
                        player.rating = 78;
                        player.fitness = 72;
                    });
                    const reserves = ["GK", "CB", "CM", "ST"].map(role => {
                        const player = createGeneratedPlayer(team, role, 22);
                        player.rating = 76;
                        player.potential = 80;
                        player.fitness = 100;
                        team.squad.push(player);
                        return player;
                    });
                    const selection = selectLineupDecision(team);
                    const lineupFitness = getLineupRatings(team, selection.players).fitness;
                    const squadFitness = team.squad.reduce((sum, player) => sum + player.fitness, 0) /
                        team.squad.length;
                    const oldPoisson = poisson;
                    let match;
                    poisson = function () { return 1; };
                    try {
                        match = simulateDetailedMatch(team, opponent, true, 1);
                    } finally {
                        poisson = oldPoisson;
                    }
                    const selectedIds = new Set(match.lineup.home.map(player => player.id));
                    const rotatedReserves = reserves.every(player => selectedIds.has(player.id));
                    const restedPlayers = team.squad.filter(player => !selectedIds.has(player.id));
                    const appearancesManaged = team.squad.every(player =>
                        player.appearances === (selectedIds.has(player.id) ? 1 : 0));
                    const fitnessManaged = reserves.every(player => player.fitness === 91) &&
                        restedPlayers.every(player => player.fitness === 79 && player.appearances === 0);
                    const rotationExplained = match.aiDecision.home.rotationCount === 4 &&
                        match.lineup.home.filter(player => player.reason === "fitness-rotation")
                            .every(player => player.comparison?.rating > player.rating);
                    const assistsGenerated = [team.id, opponent.id].every(teamId =>
                        match.events.filter(event => event.type === "assist" && event.teamId === teamId).length ===
                        match.events.filter(event => event.type === "goal" && event.teamId === teamId).length
                    );

                    state.matchLog = [{
                        week: 1,
                        divisionId: 1,
                        homeId: team.id,
                        awayId: opponent.id,
                        homeShort: team.short,
                        awayShort: opponent.short,
                        homeGoals: match.homeGoals,
                        awayGoals: match.awayGoals,
                        lineup: match.lineup,
                        aiDecision: match.aiDecision,
                        stats: match.stats
                    }];
                    const reportMarkup = renderRecords();
                    const reportVisible = reportMarkup.includes("Laporan Keputusan Pelatih Klub") &&
                        reportMarkup.includes("Rotasi kebugaran");
                    const archive = archiveCurrentSeason();
                    const archivePreservesDecision = archive.matches[0].aiDecision.home.rotationCount === 4 &&
                        archive.matches[0].lineup.home.some(player => player.reason === "fitness-rotation") &&
                        renderSeasonArchive().includes("Keputusan Pelatih");
                    return rotatedReserves && appearancesManaged && fitnessManaged && rotationExplained &&
                        lineupFitness > squadFitness && assistsGenerated &&
                        reportVisible && archivePreservesDecision;
                })()`);
                assert(result,
                    "Lineup tidak merotasi pemain bugar, kebugaran cadangan tidak pulih, atau alasan AI tidak tersimpan.");
            }],
            ["Leaderboard gol, assist, clean sheet, dan kartu", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(25);
                    const home = state.standings[20];
                    const away = state.standings[21];
                    const goalkeeper = home.squad.find(player => player.role === "GK");
                    const scorer = home.squad.find(player => player.role === "ST");
                    const assister = home.squad.find(player => player.role === "RW");
                    const cardPlayer = home.squad.find(player => player.role === "AM");
                    const awayPlayer = away.squad.find(player => player.role === "ST");
                    updatePlayerMatchStatistics(
                        home,
                        away,
                        [goalkeeper, scorer, assister, cardPlayer],
                        [awayPlayer],
                        1,
                        0,
                        [
                            { type: "goal", teamId: home.id, playerId: scorer.id, playerName: scorer.name },
                            { type: "assist", teamId: home.id, playerId: assister.id, playerName: assister.name },
                            { type: "yellow", teamId: home.id, playerId: cardPlayer.id, playerName: cardPlayer.name },
                            { type: "red", teamId: home.id, playerId: cardPlayer.id, playerName: cardPlayer.name }
                        ]
                    );
                    const defender = home.squad.find(player => player.role === "CB");
                    defender.cleanSheets = 2;
                    const goalScorers = state.standings.flatMap(team => team.squad).slice(0, 26);
                    goalScorers.forEach(player => { player.goals = 1; });
                    activeDivisionId = 1;
                    playerLeaderboardDivisionId = "all";
                    playerLeaderboardCategory = "goals";
                    playerLeaderboardPage = 1;
                    setView("records");
                    const goalkeeperExcludedFromGoals = !document.querySelector(
                        '.player-leaderboard-row[data-player-id="' + goalkeeper.id + '"]'
                    );
                    const goalsCountedCorrectly = document.querySelectorAll(".player-leaderboard-row").length === 25 &&
                        document.querySelector(".player-leaderboard .notice").textContent.includes("27 pemain");
                    const nextPageWorks = !!document.getElementById("playerLeaderboardNext");
                    document.getElementById("playerLeaderboardNext").click();
                    const paginationWorks = document.querySelector(".player-leaderboard .archive-pagination span")
                        .textContent.includes("Halaman 2 / 2") &&
                        document.querySelectorAll(".player-leaderboard-row").length === 2;

                    const leaders = [
                        ["goals", scorer, 27],
                        ["assists", assister, 1],
                        ["cleanSheets", goalkeeper, 1],
                        ["yellowCards", cardPlayer, 1],
                        ["redCards", cardPlayer, 1]
                    ];
                    const categoryLeadersWork = leaders.every(([category, player, expectedCount]) => {
                        const select = document.getElementById("playerLeaderboardCategory");
                        select.value = category;
                        select.dispatchEvent(new Event("change"));
                        const rows = [...document.querySelectorAll(".player-leaderboard-row")];
                        const onlyPositiveStats = rows.every(row =>
                            Number(row.querySelector("td:last-child strong").textContent) > 0
                        );
                        const cleanSheetsOnlyForGoalkeepers = category !== "cleanSheets" ||
                            rows.every(row => row.querySelector("td:nth-child(3)").textContent === "GK");
                        return document.querySelector(".player-leaderboard .notice").textContent
                                .includes(expectedCount + " pemain") &&
                            rows.length === Math.min(expectedCount, 25) &&
                            onlyPositiveStats &&
                            cleanSheetsOnlyForGoalkeepers &&
                            document.querySelector(".player-leaderboard-row strong").textContent === player.name;
                    });
                    const divisionSelect = document.getElementById("playerLeaderboardDivision");
                    divisionSelect.value = "2";
                    divisionSelect.dispatchEvent(new Event("change"));
                    const divisionFilterWorks = document.querySelector(".player-leaderboard-row strong").textContent === cardPlayer.name;
                    divisionSelect.value = "1";
                    divisionSelect.dispatchEvent(new Event("change"));
                    const otherDivisionExcludesPlayer = !document.querySelector(
                        '.player-leaderboard-row[data-player-id="' + cardPlayer.id + '"]'
                    );
                    const archive = archiveCurrentSeason();
                    const archivedStats = archive.players.find(player => player.id === goalkeeper.id)?.cleanSheets === 1 &&
                        archive.players.find(player => player.id === scorer.id)?.goals === 1 &&
                        archive.players.find(player => player.id === assister.id)?.assists === 1 &&
                        archive.players.find(player => player.id === cardPlayer.id)?.yellowCards === 1 &&
                        archive.players.find(player => player.id === cardPlayer.id)?.redCards === 1;
                    return goalkeeperExcludedFromGoals && goalsCountedCorrectly &&
                        nextPageWorks && paginationWorks &&
                        categoryLeadersWork && divisionFilterWorks &&
                        otherDivisionExcludesPlayer && archivedStats;
                })()`);
                assert(result,
                    "Leaderboard tidak mengurutkan kelima statistik, memfilter kasta, memaginasi, atau mengarsipkan data.");
            }],
            ["Regenerasi AI mengisi kedalaman posisi yang kurang", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    state.rules.squadLimit = 25;
                    const team = state.standings[0];
                    state.standings.forEach(club => club.squad.forEach(player => {
                        player.age = 20;
                        player.retirementAge = 50;
                        player.potential = player.rating;
                    }));
                    const oldRandom = Math.random;
                    Math.random = function () { return 0.99; };
                    let firstReport;
                    try {
                        firstReport = processPlayerSeasonLifecycle();
                        for (let season = 0; season < 3; season++) processPlayerSeasonLifecycle();
                    } finally {
                        Math.random = oldRandom;
                    }
                    const clubReport = firstReport.clubs.find(club => club.teamId === team.id);
                    const academy = clubReport.arrivals.filter(player => !player.replacementFor);
                    const nextReport = processPlayerSeasonLifecycle();
                    const noExcessRecruitment = nextReport.clubs
                        .find(club => club.teamId === team.id).arrivals.length === 0;
                    return academy.length === 2 &&
                        academy.every(player => player.reason.includes("Kedalaman")) &&
                        team.squad.length === 18 &&
                        noExcessRecruitment;
                })()`);
                assert(result,
                    "Regenerasi tidak memprioritaskan kedalaman yang kurang atau merekrut melebihi target.");
            }],
            ["Perkembangan, pensiun, regenerasi, dan batas skuad", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    state.rules.squadLimit = 12;
                    state.standings.forEach(team => team.squad.forEach(player => {
                        player.age = 19;
                        player.retirementAge = 50;
                    }));
                    const team = state.standings[0];
                    team.p = 20;
                    const young = team.squad[0];
                    young.age = 22;
                    young.rating = 70;
                    young.potential = 72;
                    young.appearances = 20;
                    young.cleanSheets = 10;
                    const veteran = team.squad[1];
                    veteran.age = 29;
                    veteran.rating = 70;
                    veteran.potential = 70;
                    const retiring = team.squad[2];
                    retiring.age = 34;
                    retiring.retirementAge = 35;
                    const oldRandom = Math.random;
                    Math.random = function () { return 0.1; };
                    let report;
                    try {
                        report = processPlayerSeasonLifecycle();
                    } finally {
                        Math.random = oldRandom;
                    }
                    const club = report.clubs[0];

                    window.__regression.reset(10);
                    state.standings = state.standings.slice(0, 1);
                    state.divisions = state.divisions.slice(0, 1);
                    state.rules.squadLimit = 25;
                    let retirementCount = 0;
                    const random = Math.random;
                    Math.random = function () { return 0.1; };
                    try {
                        for (let season = 0; season < 15; season++) {
                            retirementCount += processPlayerSeasonLifecycle().retirements.length;
                        }
                    } finally {
                        Math.random = random;
                    }
                    const longRunTeam = state.standings[0];
                    return {
                        growth: club.growth.some(player => player.name === young.name && player.to > 70),
                        decline: club.declines.some(player => player.name === veteran.name && player.to === 69),
                        retirementAndReplacement: club.retirements.some(player => player.name === retiring.name) &&
                            club.arrivals.some(player => player.replacementFor === retiring.name),
                        cappedRoster: team.squad.length === 12 &&
                            state.rules.squadLimit === 25 &&
                            longRunTeam.squad.length === 18,
                        retirementOverTime: retirementCount > 0,
                        uniquePlayers: new Set(longRunTeam.squad.map(player => player.id)).size === longRunTeam.squad.length &&
                            new Set(longRunTeam.squad.map(player => player.name)).size === longRunTeam.squad.length
                    };
                })()`);
                assert(Object.values(result).every(Boolean),
                    "Siklus pemain gagal: " + JSON.stringify(result));
            }],
            ["Jendela transfer otomatis mengikuti fase musim", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    const rulesPanelIsAutomatic = !renderRegulations().includes('id="transferWindow"') &&
                        renderRegulations().includes("Jendela transfer otomatis");
                    const totalWeeks = Math.max(...state.fixtures
                        .filter(match => match.divisionId === 1)
                        .map(match => match.week));
                    state.divisionProgress[1] = Math.floor(totalWeeks * 0.5) + 1;
                    state.transferWindows = { summer: true, winter: false };
                    const winterWindowOpens = getTransferWindowStatus().window === "winter";
                    state.transferWindows.winter = true;
                    const winterWindowClosesAfterProcessing =
                        getTransferWindowStatus().window === null &&
                        getTransferWindowStatus().label.includes("Musim dingin");

                    window.__regression.reset(10);
                    const buyer = state.standings[0];
                    const seller = state.standings[1];
                    state.standings.forEach(team => { team.budget = 0; });
                    buyer.budget = 10000;
                    state.rules.salaryCap = 10000;
                    const weakForward = buyer.squad.find(player => player.role === "ST");
                    weakForward.rating = 50;
                    weakForward.potential = 55;
                    state.rules.salaryCap = 10000;
                    const target = seller.squad.find(player => player.role === "ST");
                    target.rating = 68;
                    target.potential = 70;
                    seller.squad.forEach(player => {
                        if (player !== target) {
                            player.rating = 40;
                            player.potential = 45;
                        }
                    });
                    const reserve = createGeneratedPlayer(seller, "ST", 21);
                    reserve.rating = 30;
                    reserve.potential = 35;
                    seller.squad.push(reserve);
                    const weeks = Math.max(...state.fixtures
                        .filter(match => match.divisionId === 1)
                        .map(match => match.week));
                    state.divisionProgress[1] = Math.floor(weeks * WINTER_TRANSFER_WINDOW_START) + 1;
                    state.transferWindows = { summer: true, winter: false };
                    simulateWeek();
                    const winterTransferRuns = state.transferWindows.winter &&
                        state.lastPlayerLifecycle.transfers.some(transfer =>
                            transfer.playerId === target.id && transfer.window === "Musim dingin");
                    const transferCount = state.lastPlayerLifecycle.transfers.length;
                    simulateWeek();
                    const windowRunsOnlyOnce =
                        state.lastPlayerLifecycle.transfers.length === transferCount;
                    return {
                        rulesPanelIsAutomatic,
                        winterWindowOpens,
                        winterWindowClosesAfterProcessing,
                        winterTransferRuns,
                        windowRunsOnlyOnce
                    };
                })()`);
                assert(Object.values(result).every(Boolean),
                    "Jadwal otomatis jendela transfer gagal: " + JSON.stringify(result));
            }],
            ["Bursa transfer AI, anggaran, jendela, dan arsip musim", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    const buyer = state.standings[0];
                    const seller = state.standings[1];
                    state.standings.forEach(team => { team.budget = 0; });
                    buyer.budget = 10000;
                    state.rules.salaryCap = 10000;
                    const weakForward = buyer.squad.find(player => player.role === "ST");
                    weakForward.rating = 50;
                    weakForward.potential = 55;
                    const target = seller.squad.find(player => player.role === "ST");
                    const targetWasCore = seller.squad.includes(target);
                    target.rating = 68;
                    target.potential = 70;
                    target.fitness = 100;
                    seller.squad.forEach(player => {
                        if (player !== target) {
                            player.rating = 40;
                            player.potential = 45;
                        }
                    });
                    const reserve = createGeneratedPlayer(seller, "ST", 21);
                    reserve.rating = 30;
                    reserve.potential = 35;
                    seller.squad.push(reserve);
                    const report = processAiTransferWindow("summer");
                    const deal = report.transfers[0];
                    const openWindowWorks = report.open && report.transfers.length === 1 &&
                        report.window === "summer" &&
                        deal.playerId === target.id &&
                        buyer.squad.includes(target) && !seller.squad.includes(target) &&
                        targetWasCore && seller.squad.length === 11 &&
                        buyer.budget === 10000 - deal.fee && seller.budget === deal.fee &&
                        deal.reason.includes("penyerangan");

                    window.__regression.reset(10);
                    const floorBuyer = state.standings[0];
                    const floorSeller = state.standings[1];
                    floorBuyer.budget = 10000;
                    const floorTarget = floorSeller.squad.find(player => player.role === "ST");
                    floorTarget.rating = 68;
                    const floorReport = processAiTransferWindow("summer");
                    const minimumSquadWorks = floorSeller.squad.length === 11 &&
                        floorSeller.squad.includes(floorTarget) &&
                        floorReport.transfers.length === 0;

                    window.__regression.reset(10);
                    const closedBuyer = state.standings[0];
                    const closedSeller = state.standings[1];
                    closedBuyer.budget = 10000;
                    const closedTarget = createGeneratedPlayer(closedSeller, "ST", 21);
                    closedTarget.rating = 68;
                    closedSeller.squad.push(closedTarget);
                    const closedWeeks = Math.max(...state.fixtures
                        .filter(match => match.divisionId === 1)
                        .map(match => match.week));
                    state.divisionProgress[1] = Math.ceil(closedWeeks * 0.2) + 1;
                    const closedReport = processAiTransferWindow();
                    const closedWindowWorks = !closedReport.open &&
                        closedReport.transfers.length === 0 &&
                        !closedBuyer.squad.includes(closedTarget) &&
                        closedBuyer.budget === 10000;

                    window.__regression.reset(10);
                    const constrainedBuyer = state.standings[0];
                    const constrainedSeller = state.standings[1];
                    constrainedBuyer.budget = 1;
                    const constrainedTarget = createGeneratedPlayer(constrainedSeller, "ST", 21);
                    constrainedTarget.rating = 68;
                    constrainedSeller.squad.push(constrainedTarget);
                    const unaffordable = processAiTransferWindow();
                    const budgetLimitWorks = unaffordable.transfers.length === 0 &&
                        !constrainedBuyer.squad.includes(constrainedTarget);
                    constrainedBuyer.budget = 10000;
                    state.rules.squadLimit = constrainedBuyer.squad.length;
                    const fullSquad = processAiTransferWindow();
                    const squadLimitWorks = fullSquad.transfers.length === 0 &&
                        constrainedBuyer.squad.length === state.rules.squadLimit;

                    window.__regression.reset(10);
                    const seasonBuyer = state.standings[0];
                    const seasonSeller = state.standings[state.standings.length - 1];
                    state.standings.forEach(team => {
                        team.budget = 0;
                        team.squad.forEach(player => {
                            player.age = 22;
                            player.retirementAge = 50;
                        });
                    });
                    seasonBuyer.budget = 10000;
                    const seasonWeakForward = seasonBuyer.squad.find(player => player.role === "ST");
                    seasonWeakForward.rating = 50;
                    seasonWeakForward.potential = 55;
                    state.rules.salaryCap = 10000;
                    const seasonTarget = seasonSeller.squad.find(player => player.role === "ST");
                    seasonTarget.rating = 68;
                    seasonTarget.potential = 70;
                    seasonSeller.squad.forEach(player => {
                        if (player !== seasonTarget) {
                            player.rating = 40;
                            player.potential = 45;
                        }
                    });
                    const seasonReserve = createGeneratedPlayer(seasonSeller, "ST", 21);
                    seasonReserve.rating = 30;
                    seasonReserve.potential = 35;
                    seasonSeller.squad.push(seasonReserve);
                    state.pendingSeasonTransition = {
                        season: state.season,
                        movements: [],
                        playoffs: []
                    };
                    window.__regression.completeSeason();
                    startNextSeason();
                    const currentArchive = archiveCurrentSeason();
                    const summerTransfers = state.lastPlayerLifecycle.transfers;
                    const rolloverReportHasDeal = summerTransfers.length > 0;
                    const rolloverRostersUpdated = summerTransfers.every(transfer => {
                        const buyer = getTeam(transfer.toTeamId);
                        const seller = getTeam(transfer.fromTeamId);
                        return buyer?.squad.some(player => player.id === transfer.playerId) &&
                            !seller?.squad.some(player => player.id === transfer.playerId);
                    });
                    const rolloverArchiveHasFees = summerTransfers.every(transfer =>
                        transfer.fee > 0);
                    const rolloverArchiveHasDeals = summerTransfers.every(transfer =>
                        currentArchive.transfers.some(archivedTransfer =>
                            archivedTransfer.playerId === transfer.playerId &&
                            archivedTransfer.window === "Musim panas"));
                    return {
                        openWindowWorks,
                        minimumSquadWorks,
                        closedWindowWorks,
                        budgetLimitWorks,
                        squadLimitWorks,
                        rolloverReportHasDeal,
                        rolloverRostersUpdated,
                        rolloverArchiveHasFees,
                        rolloverArchiveHasDeals
                    };
                })()`);
                assert(Object.values(result).every(Boolean),
                    "Bursa AI gagal memenuhi kebutuhan, batas skuad, aturan anggaran/jendela, atau arsip: " +
                    JSON.stringify(result));
            }],
            ["Konfirmasi rollover yang dibatalkan tidak mengubah pemain", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    window.__regression.completeSeason();
                    state.pendingSeasonTransition = { season: state.season, movements: [], playoffs: [] };
                    const season = state.season;
                    const ages = JSON.stringify(state.standings.map(team => team.squad.map(player => player.age)));
                    const previousConfirm = window.confirm;
                    window.confirm = function () { return false; };
                    try {
                        startNextSeason();
                    } finally {
                        window.confirm = previousConfirm;
                    }
                    return state.season === season &&
                        JSON.stringify(state.standings.map(team => team.squad.map(player => player.age))) === ages &&
                        state.lastPlayerLifecycle === null &&
                        state.seasonHistory.length === 0;
                })()`);
                assert(result, "Pemain berubah sebelum konfirmasi rollover.");
            }],
            ["Navigasi kembali dan tautan klub di riwayat", () => {
                const result = inApp(`(() => {
                    window.__regression.reset(10);
                    state.matchLog = [{
                        week: 1, divisionId: 1, homeId: 1, awayId: 2,
                        homeGoals: 2, awayGoals: 1,
                        homeShort: state.standings[0].short,
                        awayShort: state.standings[1].short
                    }];
                    setView("ratings");
                    document.querySelector('[data-club-id="1"]').click();
                    const backToRatings = document.getElementById("clubDetailBack").textContent.includes("Rating Tim");
                    const squadFitnessShown = document.querySelector(".squad-player-info small")
                        .textContent.includes("Kebugaran");
                    document.querySelector('.club-opponent-link[data-club-id="2"]').click();
                    const opponentOpened = activeView === "club" && selectedTeamId === 2;
                    document.getElementById("clubDetailBack").click();
                    const originalClubRestored = activeView === "club" && selectedTeamId === 1;
                    document.getElementById("clubDetailBack").click();
                    const ratingsRestored = activeView === "ratings";
                    setView("teams");
                    document.querySelector('[data-club-id="1"]').click();
                    const teamsBack = document.getElementById("clubDetailBack").textContent.includes("Klub Peserta");
                    document.getElementById("clubDetailBack").click();
                    const teamsRestored = activeView === "teams";
                    return backToRatings && squadFitnessShown && opponentOpened && originalClubRestored &&
                        ratingsRestored && teamsBack && teamsRestored;
                })()`);
                assert(result, "Kembali tidak memulihkan menu atau klub asal.");
            }]
        ];

        for (const [name, test] of tests) {
            if (await runTest(name, test)) passed += 1;
            else failed += 1;
        }

        summary.textContent = failed
            ? `${passed} dari ${tests.length} tes lulus; ${failed} tes gagal.`
            : `Semua ${passed} kelompok tes lulus.`;
        runButton.disabled = false;
        runButton.textContent = "Jalankan ulang tes";
    }

    runButton.addEventListener("click", runAllTests);
})();
