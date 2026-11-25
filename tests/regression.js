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
        } catch (error) {
            item.className = "failed";
            item.textContent = `GAGAL — ${name}: ${error.message}`;
            throw error;
        } finally {
            results.appendChild(item);
        }
    }

    async function runAllTests() {
        runButton.disabled = true;
        results.replaceChildren();
        let passed = 0;
        const tests = [
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
                        { upperDivisionId: 2, lowerDivisionId: 3, mode: "cross_playoff", promotedCount: 0, relegatedCount: 0, playoffSpots: 0, crossPlayoffPosition: 14 }
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
                    oldState.pendingSeasonTransition = { season: oldState.season, movements: [], playoffs: [] };
                    oldState.standings.forEach(team => {
                        delete team.nextPlayerSequence;
                        team.squad.forEach(player => {
                            delete player.age;
                            delete player.potential;
                            delete player.retirementAge;
                            delete player.lastSeasonChange;
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
                assert(result.upgraded && result.pendingPreserved && result.archiveDefaulted && result.careerDataAdded,
                    "Save lama atau fase akhir musim pending tidak dimuat dengan benar.");
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
                    const reportVisible = reportMarkup.includes("Laporan Keputusan AI Klub") &&
                        reportMarkup.includes("Rotasi kebugaran");
                    const archive = archiveCurrentSeason();
                    const archivePreservesDecision = archive.matches[0].aiDecision.home.rotationCount === 4 &&
                        archive.matches[0].lineup.home.some(player => player.reason === "fitness-rotation") &&
                        renderSeasonArchive().includes("Keputusan AI");
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
                    activeDivisionId = 1;
                    playerLeaderboardDivisionId = "all";
                    playerLeaderboardCategory = "goals";
                    playerLeaderboardPage = 1;
                    setView("records");
                    const totalPlayers = state.standings.reduce((count, team) => count + team.squad.length, 0);
                    const everyPlayerListed = document.querySelectorAll(".player-leaderboard-row").length === 25 &&
                        document.querySelector(".player-leaderboard .notice").textContent.includes(totalPlayers + " pemain");
                    const nextPageWorks = !!document.getElementById("playerLeaderboardNext");
                    document.getElementById("playerLeaderboardNext").click();
                    const paginationWorks = document.querySelector(".player-leaderboard .archive-pagination span")
                        .textContent.includes("Halaman 2 /");

                    const leaders = [
                        ["goals", scorer],
                        ["assists", assister],
                        ["cleanSheets", goalkeeper],
                        ["yellowCards", cardPlayer],
                        ["redCards", cardPlayer]
                    ];
                    const categoryLeadersWork = leaders.every(([category, player]) => {
                        const select = document.getElementById("playerLeaderboardCategory");
                        select.value = category;
                        select.dispatchEvent(new Event("change"));
                        return document.querySelector(".player-leaderboard-row strong").textContent === player.name;
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
                    return everyPlayerListed && nextPageWorks && paginationWorks &&
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
                    const young = team.squad[0];
                    young.age = 22;
                    young.rating = 70;
                    young.potential = 72;
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
                        growth: club.growth.some(player => player.name === young.name && player.to === 71),
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
            try {
                await runTest(name, test);
                passed += 1;
            } catch (error) {
                summary.textContent = `${passed} dari ${tests.length} tes lulus.`;
                runButton.disabled = false;
                runButton.textContent = "Jalankan ulang tes";
                return;
            }
        }

        summary.textContent = `Semua ${passed} kelompok tes lulus.`;
        runButton.disabled = false;
        runButton.textContent = "Jalankan ulang tes";
    }

    runButton.addEventListener("click", runAllTests);
})();
