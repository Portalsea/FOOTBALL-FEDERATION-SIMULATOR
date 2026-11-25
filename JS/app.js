const SAVE_KEY = "aosb-league-save-v3";
const PREVIOUS_SAVE_KEY = "aosb-league-save-v2";
const MIN_TEAMS = 10;
const MAX_TEAMS_PER_DIVISION = 20;
const PLAYER_FIRST_NAMES = ["Ardi", "Bima", "Candra", "Daffa", "Eka", "Fajar", "Galih", "Hadi", "Ilham", "Joko", "Kamal"];
const PLAYER_LAST_NAMES = ["Santoso", "Wijaya", "Pratama", "Kurniawan", "Permana", "Ramadhan"];
const PLAYER_ROLES = ["GK", "RB", "CB", "LB", "CM", "RW", "ST", "LW", "AM"];
const PLAYER_FITNESS_ROTATION_WEIGHT = 0.25;
const STARTING_FITNESS_COST = 9;
const BENCH_FITNESS_RECOVERY = 7;
const MAX_ACADEMY_ADDITIONS_PER_SEASON = 2;
const SQUAD_DEPTH_TARGETS = { GK: 2, DEF: 6, MID: 5, FWD: 5 };
const PLAYER_LEADERBOARD_PAGE_SIZE = 25;
const PLAYER_LEADERBOARD_CATEGORIES = [
    { id: "goals", label: "Pencetak Gol" },
    { id: "assists", label: "Assist Terbanyak" },
    { id: "cleanSheets", label: "Clean Sheet" },
    { id: "yellowCards", label: "Kartu Kuning" },
    { id: "redCards", label: "Kartu Merah" }
];
const SQUAD_DEPTH_LABELS = {
    GK: "penjaga gawang",
    DEF: "pertahanan",
    MID: "tengah",
    FWD: "penyerangan"
};

const defaultTeamNames = [
    "Bulls", "Color Blind", "ECO", "FC Blade",
    "FC Reasons", "Ftring", "HugHes", "JK Club",
    "TOTORO", "Velda Gr", "Veldora FC", "White Lion's"
];

function getInitials(name) {
    return name.trim().split(/\s+/).slice(0, 3).map(word => word[0]).join("").toUpperCase();
}

function seededValue(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
}

function createTeamSquad(teamName, rating, teamIndex) {
    const roles = ["GK", "RB", "CB", "CB", "LB", "CM", "CM", "RW", "ST", "LW", "AM"];
    return roles.map((role, index) => {
        const seed = teamIndex * 31 + index * 7;
        const variation = Math.floor(seededValue(seed) * 5) - 2;
        const playerRating = Math.max(62, Math.min(92, rating + variation));
        const careerSeed = (teamIndex + 1) * 101 + (index + 1) * 17;
        return {
            id: `${teamIndex + 1}-${index + 1}`,
            name: `${PLAYER_FIRST_NAMES[index]} ${PLAYER_LAST_NAMES[(teamIndex + index) % PLAYER_LAST_NAMES.length]}`,
            role,
            rating: playerRating,
            fitness: 92 + Math.floor(seededValue(seed + 4) * 8),
            age: 18 + Math.floor(seededValue(careerSeed) * 15),
            potential: Math.min(95, playerRating + 3 + Math.floor(seededValue(careerSeed + 1) * 13)),
            retirementAge: 36 + Math.floor(seededValue(careerSeed + 2) * 4),
            lastSeasonChange: 0,
            goals: 0,
            assists: 0,
            appearances: 0,
            cleanSheets: 0,
            yellowCards: 0,
            redCards: 0
        };
    });
}

function getUniqueShortNames(names) {
    const used = new Set();
    return names.map(name => {
        const base = getInitials(name);
        let short = base.slice(0, 3);
        let suffix = 2;
        while (used.has(short)) {
            const number = String(suffix++);
            short = `${base.slice(0, Math.max(1, 3 - number.length))}${number}`;
        }
        used.add(short);
        return short;
    });
}

function createInitialState(leagueName, teamNames) {
    const shortNames = getUniqueShortNames(teamNames);
    const divisionCount = Math.ceil(teamNames.length / MAX_TEAMS_PER_DIVISION);
    const divisions = Array.from({ length: divisionCount }, (_, index) => ({
        id: index + 1,
        name: `Kasta ${index + 1}`
    }));
    const teams = teamNames.map((name, index) => ({
        id: index + 1,
        name: name.trim(),
        short: shortNames[index],
        city: "Kota",
        rating: 68 + ((index * 7) % 12),
        attackRating: 68 + ((index * 5) % 11),
        defenseRating: 68 + ((index * 9) % 11),
        midfieldRating: 68 + ((index * 7) % 11),
        fitness: 92,
        momentum: 50,
        rankingPoints: 1000,
        previousRankingPoints: 1000,
        rankingChange: 0,
        previousDivisionRank: (index % MAX_TEAMS_PER_DIVISION) + 1,
        previousGlobalRank: index + 1,
        globalRank: index + 1,
        squad: createTeamSquad(name, 68 + ((index * 7) % 12), index),
        nextPlayerSequence: 12,
        budget: 1800 + ((index * 350) % 2000),
        fans: 55 + ((index * 9) % 40),
        divisionId: Math.floor(index / MAX_TEAMS_PER_DIVISION) + 1
    }));
    const state = {
        version: 3,
        leagueName: leagueName.trim(),
        season: "2026/27",
        week: 1,
        divisionProgress: {},
        federationBudget: 12000,
        reputation: 86,
        rules: {
            pointsWin: 3,
            pointsDraw: 1,
            foreignPlayers: 5,
            squadLimit: 25,
            salaryCap: 800,
            transferWindow: "Terbuka",
            homeAdvantage: "Normal",
            discipline: "Standar",
            promotionCount: 2,
            relegationCount: 2,
            divisionMovements: []
        },
        divisions,
        standings: teams.map(team => ({
            ...team,
            p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
        })),
        matchLog: [],
        lastMovements: [],
        lastPlayoffs: [],
        playoffHistory: [],
        seasonHistory: [],
        pendingSeasonTransition: null,
        lastMovementSeason: null,
        lastPlayerLifecycle: null,
        playerRetirementHistory: []
    };
    state.rules.divisionMovements = createDefaultDivisionMovements(
        state.divisions,
        getDivisionSizes(state.standings)
    );
    state.divisions.forEach(division => {
        state.divisionProgress[division.id] = 1;
    });
    state.fixtures = divisions.flatMap(division => {
        const teamIds = teams
            .filter(team => team.divisionId === division.id)
            .map(team => team.id);
        return createFixtures(teamIds, division.id, state.season);
    });
    return state;
}

function createFixtures(teamIds, divisionId, seasonName) {
    const ids = [...teamIds];
    if (ids.length % 2 !== 0) ids.push(null);
    const rounds = [];

    function addHalf(reverse) {
        const rotation = [...ids];
        for (let round = 0; round < rotation.length - 1; round++) {
            const roundMatches = [];
            for (let i = 0; i < rotation.length / 2; i++) {
                const pair = [rotation[i], rotation[rotation.length - 1 - i]];
                if (pair.includes(null)) continue;
                if (reverse) pair.reverse();
                roundMatches.push({ homeId: pair[0], awayId: pair[1] });
            }
            rounds.push(roundMatches);
            rotation.splice(1, 0, rotation.pop());
        }
    }

    addHalf(false);
    addHalf(true);
    const fixtures = [];
    rounds.forEach((round, index) => {
        round.forEach(match => {
            fixtures.push({
                week: index + 1,
                divisionId,
                season: seasonName || "2026/27",
                ...match,
                played: false,
                homeGoals: null,
                awayGoals: null
            });
        });
    });
    return fixtures;
}

let saveLoadError = false;

function normalizeActiveSeasonStats(parsed) {
    if (!parsed?.standings || !parsed?.fixtures) return parsed;

    parsed.standings.forEach(team => {
        team.p = 0;
        team.w = 0;
        team.d = 0;
        team.l = 0;
        team.gf = 0;
        team.ga = 0;
        team.pts = 0;
    });

    const wins = Number(parsed.rules?.pointsWin) || 3;
    const draws = Number(parsed.rules?.pointsDraw) || 1;
    parsed.fixtures.filter(match => match.played &&
        (match.season ? match.season === parsed.season : true)).forEach(match => {
        const home = parsed.standings.find(team => team.id === match.homeId);
        const away = parsed.standings.find(team => team.id === match.awayId);
        if (!home || !away) return;
        const homeGoals = Number(match.homeGoals) || 0;
        const awayGoals = Number(match.awayGoals) || 0;

        home.p++;
        away.p++;
        home.gf += homeGoals;
        home.ga += awayGoals;
        away.gf += awayGoals;
        away.ga += homeGoals;

        if (homeGoals > awayGoals) {
            home.w++;
            home.pts += wins;
            away.l++;
        } else if (homeGoals < awayGoals) {
            away.w++;
            away.pts += wins;
            home.l++;
        } else {
            home.d++;
            away.d++;
            home.pts += draws;
            away.pts += draws;
        }
    });
    return parsed;
}

function compareTableStandings(a, b) {
    return b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf;
}

function initializePreviousDivisionRanks(standings, overwrite = false) {
    const divisionIds = [...new Set(standings.map(team => team.divisionId))];
    divisionIds.forEach(divisionId => {
        standings
            .filter(team => team.divisionId === divisionId)
            .sort(compareTableStandings)
            .forEach((team, index) => {
                if (overwrite || !Number.isFinite(Number(team.previousDivisionRank))) {
                    team.previousDivisionRank = index + 1;
                }
            });
    });
}

function loadState() {
    try {
        const saved = localStorage.getItem(SAVE_KEY) || localStorage.getItem(PREVIOUS_SAVE_KEY);
        const parsed = saved ? JSON.parse(saved) : null;
        if (parsed && (parsed.version === 2 || parsed.version === 3)) {
            parsed.version = 3;
            parsed.leagueName = parsed.leagueName || "Liga Nusantara";
            parsed.rules = parsed.rules || {};
            parsed.rules.promotionCount = Number.isFinite(parsed.rules.promotionCount)
                ? parsed.rules.promotionCount : 2;
            parsed.rules.relegationCount = Number.isFinite(parsed.rules.relegationCount)
                ? parsed.rules.relegationCount : 2;
            if (!Array.isArray(parsed.rules.divisionMovements)) {
                parsed.rules.divisionMovements = [];
            }
            if (!parsed.divisionProgress) parsed.divisionProgress = {};
            if (!Array.isArray(parsed.lastMovements)) parsed.lastMovements = [];
            if (!Array.isArray(parsed.lastPlayoffs)) parsed.lastPlayoffs = [];
            if (!Array.isArray(parsed.playoffHistory)) parsed.playoffHistory = [...parsed.lastPlayoffs];
            if (!Array.isArray(parsed.seasonHistory)) parsed.seasonHistory = [];
            if (!Array.isArray(parsed.playerRetirementHistory)) parsed.playerRetirementHistory = [];
            if (!parsed.lastPlayerLifecycle || !Array.isArray(parsed.lastPlayerLifecycle.clubs)) {
                parsed.lastPlayerLifecycle = null;
            }
            if (!parsed.pendingSeasonTransition ||
                !Array.isArray(parsed.pendingSeasonTransition.movements) ||
                !Array.isArray(parsed.pendingSeasonTransition.playoffs)) {
                parsed.pendingSeasonTransition = null;
            }
            if (!parsed.lastMovementSeason) parsed.lastMovementSeason = parsed.season;
            if (!parsed.divisions) {
                const divisionCount = Math.ceil(parsed.standings.length / MAX_TEAMS_PER_DIVISION);
                parsed.divisions = Array.from({ length: divisionCount }, (_, index) => ({
                    id: index + 1,
                    name: `Kasta ${index + 1}`
                }));
            }
            parsed.rules.divisionMovements = normalizeLoadedDivisionMovements(parsed);
            parsed.standings.forEach((team, index) => {
                team.divisionId = team.divisionId || (Math.floor(index / MAX_TEAMS_PER_DIVISION) + 1);
            });
            parsed.standings.forEach((team, index) => {
                team.rating = Number(team.rating) || 68;
                team.attackRating = Number(team.attackRating) || team.rating;
                team.defenseRating = Number(team.defenseRating) || team.rating;
                team.midfieldRating = Number(team.midfieldRating) || team.rating;
                team.fitness = Number(team.fitness) || 92;
                team.momentum = Number(team.momentum) || 50;
                team.rankingPoints = Number(team.rankingPoints) || (1000 + (team.rating - 68) * 24);
                team.previousRankingPoints = Number(team.previousRankingPoints) || team.rankingPoints;
                team.rankingChange = Number(team.rankingChange) || 0;
                team.previousGlobalRank = Number(team.previousGlobalRank) || (index + 1);
                team.globalRank = Number(team.globalRank) || (index + 1);
                team.squad = Array.isArray(team.squad) && team.squad.length
                    ? team.squad
                    : createTeamSquad(team.name, team.rating, index);
                team.squad.forEach((player, playerIndex) => {
                    const careerSeed = team.id * 101 + (playerIndex + 1) * 17;
                    player.id = player.id || `${team.id}-${playerIndex + 1}`;
                    player.rating = Number(player.rating) || team.rating;
                    player.fitness = Math.max(70, Math.min(100,
                        Number(player.fitness) || Number(team.fitness) || 92));
                    player.goals = Number(player.goals) || 0;
                    player.assists = Number(player.assists) || 0;
                    player.appearances = Number(player.appearances) || 0;
                    player.cleanSheets = Number(player.cleanSheets) || 0;
                    player.yellowCards = Number(player.yellowCards) || 0;
                    player.redCards = Number(player.redCards) || 0;
                    player.age = Number.isFinite(Number(player.age))
                        ? Number(player.age)
                        : 18 + Math.floor(seededValue(careerSeed) * 15);
                    player.potential = Math.max(
                        player.rating,
                        Number(player.potential) || Math.min(
                            95,
                            player.rating + 3 + Math.floor(seededValue(careerSeed + 1) * 13)
                        )
                    );
                    player.retirementAge = Math.max(
                        player.age + 1,
                        Number(player.retirementAge) || 36 + Math.floor(seededValue(careerSeed + 2) * 4)
                    );
                    player.lastSeasonChange = Number(player.lastSeasonChange) || 0;
                });
                const lastSequence = team.squad.reduce((max, player) => {
                    const match = /-(\d+)$/.exec(String(player.id));
                    return match ? Math.max(max, Number(match[1])) : max;
                }, 0);
                team.nextPlayerSequence = Math.max(
                    Number(team.nextPlayerSequence) || 1,
                    lastSequence + 1
                );
            });
            parsed.divisions.forEach(division => {
                parsed.divisionProgress[division.id] =
                    parsed.divisionProgress[division.id] || 1;
            });
            if (parsed.fixtures) {
                parsed.fixtures.forEach(match => {
                    if (!match.divisionId) {
                        const team = parsed.standings.find(item => item.id === match.homeId);
                        match.divisionId = team?.divisionId || 1;
                    }
                });
            }
            const oldShortToId = new Map(parsed.standings.map(team => [team.short, team.id]));
            const shortNames = getUniqueShortNames(parsed.standings.map(team => team.name));
            parsed.standings.forEach((team, index) => {
                team.short = shortNames[index];
            });
            parsed.matchLog.forEach(match => {
                if (!match.homeId) match.homeId = oldShortToId.get(match.homeShort);
                if (!match.awayId) match.awayId = oldShortToId.get(match.awayShort);
                const home = parsed.standings.find(team => team.id === match.homeId);
                const away = parsed.standings.find(team => team.id === match.awayId);
                if (home) match.homeShort = home.short;
                if (away) match.awayShort = away.short;
            });
            normalizeActiveSeasonStats(parsed);
            initializePreviousDivisionRanks(parsed.standings);
            localStorage.setItem(SAVE_KEY, JSON.stringify(parsed));
            return parsed;
        }
        return null;
    } catch (error) {
        saveLoadError = true;
        return null;
    }
}

const regressionTestMode = new URLSearchParams(window.location.search).get("regression") === "1";
let state = regressionTestMode ? null : loadState();
let activeView = "overview";
let activeDivisionId = 1;
let selectedTeamId = null;
let clubViewHistory = [];
let selectedArchiveSeason = null;
let selectedArchiveDivisionId = 1;
let selectedArchiveClubId = null;
let archiveMatchPage = 1;
let playerLeaderboardCategory = "goals";
let playerLeaderboardDivisionId = "all";
let playerLeaderboardPage = 1;
let editorDraft = [];
let editorMode = "new";
let editorLeagueName = "Liga Nusantara";
let movementDraft = [];

function isSeasonComplete() {
    if (!state || !state.divisions || !state.divisionProgress) return false;
    return state.divisions.every(division => {
        const divisionFixtures = state.fixtures.filter(match => match.divisionId === division.id);
        const totalWeeks = Math.max(1, ...divisionFixtures.map(match => match.week));
        return (state.divisionProgress[division.id] || 1) > totalWeeks;
    });
}

function canEditLeague() {
    return isSeasonComplete() && !state.pendingSeasonTransition;
}

function saveState(notify = true) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    if (notify) showToast("Data liga berhasil disimpan");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function createDefaultDivisionMovements(divisions, divisionSizes = {}) {
    return divisions.slice(0, -1).map((division, index) => ({
        upperDivisionId: division.id,
        lowerDivisionId: division.id + 1,
        mode: "auto",
        promotedCount: Math.min(
            2,
            divisionSizes[division.id + 1] || MAX_TEAMS_PER_DIVISION,
            divisionSizes[division.id] || MAX_TEAMS_PER_DIVISION
        ),
        relegatedCount: Math.min(
            2,
            divisionSizes[division.id] || MAX_TEAMS_PER_DIVISION,
            divisionSizes[division.id + 1] || MAX_TEAMS_PER_DIVISION
        ),
        playoffSpots: 0,
        crossPlayoffPosition: 3
    }));
}

function normalizeDivisionMovements(divisions) {
    const existing = state?.rules?.divisionMovements || [];
    return divisions.slice(0, -1).map((division, index) => {
        const saved = existing[index] || {};
        return {
            upperDivisionId: division.id,
            lowerDivisionId: division.id + 1,
            mode: ["auto", "internal_playoff", "cross_playoff"].includes(saved.mode) ? saved.mode : "auto",
            promotedCount: Number.isFinite(Number(saved.promotedCount)) ? Math.max(0, Number(saved.promotedCount)) : 2,
            relegatedCount: Number.isFinite(Number(saved.relegatedCount)) ? Math.max(0, Number(saved.relegatedCount)) : 2,
            playoffSpots: Number.isFinite(Number(saved.playoffSpots)) ? Math.max(0, Number(saved.playoffSpots)) : 0,
            crossPlayoffPosition: Math.max(1, Number(saved.crossPlayoffPosition) || 3)
        };
    });
}

function reconcileMovementDraft(divisions, existingMovements, divisionSizes = {}) {
    const defaults = createDefaultDivisionMovements(divisions, divisionSizes);
    return defaults.map((defaultMovement, index) => {
        const saved = existingMovements[index];
        return saved ? {
            ...defaultMovement,
            mode: ["auto", "internal_playoff", "cross_playoff"].includes(saved.mode) ? saved.mode : "auto",
            promotedCount: Number.isFinite(Number(saved.promotedCount)) ? Number(saved.promotedCount) : defaultMovement.promotedCount,
            relegatedCount: Number.isFinite(Number(saved.relegatedCount)) ? Number(saved.relegatedCount) : defaultMovement.relegatedCount,
            playoffSpots: Number.isFinite(Number(saved.playoffSpots)) ? Number(saved.playoffSpots) : defaultMovement.playoffSpots,
            crossPlayoffPosition: Number.isFinite(Number(saved.crossPlayoffPosition)) ? Number(saved.crossPlayoffPosition) : defaultMovement.crossPlayoffPosition
        } : defaultMovement;
    });
}

function normalizeLoadedDivisionMovements(parsedState) {
    const existing = parsedState.rules.divisionMovements || [];
    return parsedState.divisions.slice(0, -1).map((division, index) => {
        const saved = existing[index] || {};
        return {
            upperDivisionId: division.id,
            lowerDivisionId: division.id + 1,
            mode: ["auto", "internal_playoff", "cross_playoff"].includes(saved.mode) ? saved.mode : "auto",
            promotedCount: Number.isFinite(Number(saved.promotedCount)) ? Math.max(0, Number(saved.promotedCount)) : 2,
            relegatedCount: Number.isFinite(Number(saved.relegatedCount)) ? Math.max(0, Number(saved.relegatedCount)) : 2,
            playoffSpots: Number.isFinite(Number(saved.playoffSpots)) ? Math.max(0, Number(saved.playoffSpots)) : 0,
            crossPlayoffPosition: Number.isFinite(Number(saved.crossPlayoffPosition)) ? Math.max(1, Number(saved.crossPlayoffPosition)) : 3
        };
    });
}

function validateDivisionMovementRules(rules, divisionSizes, standings = null) {
    const outgoingSlots = {};
    const rankedDivisions = new Map();
    const outgoingCandidates = new Map();
    if (standings) {
        state.divisions.forEach(division => {
            rankedDivisions.set(division.id, standings
                .filter(team => team.divisionId === division.id)
                .sort(compareTableStandings));
        });
    }
    const reserveCandidates = (divisionId, teams, boundary) => {
        if (!standings) return "";
        let reserved = outgoingCandidates.get(divisionId);
        if (!reserved) {
            reserved = new Map();
            outgoingCandidates.set(divisionId, reserved);
        }
        for (const team of teams) {
            if (!team) continue;
            if (reserved.has(team.id)) {
                return `Kasta ${divisionId}: aturan pada batas ${reserved.get(team.id)} dan ${boundary} memakai klub yang sama.`;
            }
            reserved.set(team.id, boundary);
        }
        return "";
    };

    for (let index = 0; index < rules.length; index++) {
        const rule = rules[index];
        const upperSize = divisionSizes[rule.upperDivisionId] || 0;
        const lowerSize = divisionSizes[rule.lowerDivisionId] || 0;
        const prefix = `Batas Kasta ${rule.upperDivisionId}/${rule.lowerDivisionId}:`;

        if (rule.promotedCount > lowerSize || rule.relegatedCount > upperSize) {
            return `${prefix} jumlah promosi atau degradasi melebihi jumlah klub di divisi.`;
        }
        if (rule.mode === "internal_playoff") {
            if (rule.playoffSpots < 2 || rule.playoffSpots > lowerSize - rule.promotedCount) {
                return `${prefix} jumlah peserta play-off internal harus minimal 2 dan tersedia setelah promosi otomatis.`;
            }
            if (rule.relegatedCount !== rule.promotedCount + 1) {
                return `${prefix} degradasi harus sama dengan promosi otomatis ditambah satu pemenang play-off.`;
            }
            const upper = rankedDivisions.get(rule.upperDivisionId) || [];
            const lower = rankedDivisions.get(rule.lowerDivisionId) || [];
            const upperConflict = reserveCandidates(
                rule.upperDivisionId,
                upper.slice(-rule.relegatedCount),
                `${rule.upperDivisionId}/${rule.lowerDivisionId}`
            );
            const lowerConflict = reserveCandidates(
                rule.lowerDivisionId,
                lower.slice(0, rule.promotedCount + rule.playoffSpots),
                `${rule.upperDivisionId}/${rule.lowerDivisionId}`
            );
            if (upperConflict || lowerConflict) return upperConflict || lowerConflict;
            outgoingSlots[rule.lowerDivisionId] =
                (outgoingSlots[rule.lowerDivisionId] || 0) + rule.promotedCount + 1;
            outgoingSlots[rule.upperDivisionId] =
                (outgoingSlots[rule.upperDivisionId] || 0) + rule.relegatedCount;
            continue;
        }
        if (rule.mode === "cross_playoff") {
            if (rule.promotedCount !== rule.relegatedCount) {
                return `${prefix} promosi otomatis dan degradasi otomatis harus sama jumlahnya.`;
            }
            if (rule.crossPlayoffPosition <= rule.promotedCount ||
                rule.crossPlayoffPosition > lowerSize ||
                rule.crossPlayoffPosition <= rule.relegatedCount ||
                rule.crossPlayoffPosition > upperSize) {
                return `${prefix} posisi play-off harus tersedia dan tidak boleh bentrok dengan slot otomatis.`;
            }
            const upper = rankedDivisions.get(rule.upperDivisionId) || [];
            const lower = rankedDivisions.get(rule.lowerDivisionId) || [];
            const upperConflict = reserveCandidates(
                rule.upperDivisionId,
                [
                    ...(rule.relegatedCount > 0 ? upper.slice(-rule.relegatedCount) : []),
                    upper[upper.length - rule.crossPlayoffPosition]
                ],
                `${rule.upperDivisionId}/${rule.lowerDivisionId}`
            );
            const lowerConflict = reserveCandidates(
                rule.lowerDivisionId,
                [
                    ...lower.slice(0, rule.promotedCount),
                    lower[rule.crossPlayoffPosition - 1]
                ],
                `${rule.upperDivisionId}/${rule.lowerDivisionId}`
            );
            if (upperConflict || lowerConflict) return upperConflict || lowerConflict;
            outgoingSlots[rule.lowerDivisionId] =
                (outgoingSlots[rule.lowerDivisionId] || 0) + rule.promotedCount + 1;
            outgoingSlots[rule.upperDivisionId] =
                (outgoingSlots[rule.upperDivisionId] || 0) + rule.relegatedCount + 1;
            continue;
        }
        if (rule.promotedCount !== rule.relegatedCount) {
            return `${prefix} promosi dan degradasi otomatis harus sama jumlahnya.`;
        }
        const upper = rankedDivisions.get(rule.upperDivisionId) || [];
        const lower = rankedDivisions.get(rule.lowerDivisionId) || [];
        const upperConflict = reserveCandidates(
            rule.upperDivisionId,
            rule.relegatedCount > 0 ? upper.slice(-rule.relegatedCount) : [],
            `${rule.upperDivisionId}/${rule.lowerDivisionId}`
        );
        const lowerConflict = reserveCandidates(
            rule.lowerDivisionId,
            lower.slice(0, rule.promotedCount),
            `${rule.upperDivisionId}/${rule.lowerDivisionId}`
        );
        if (upperConflict || lowerConflict) return upperConflict || lowerConflict;
        outgoingSlots[rule.lowerDivisionId] =
            (outgoingSlots[rule.lowerDivisionId] || 0) + rule.promotedCount;
        outgoingSlots[rule.upperDivisionId] =
            (outgoingSlots[rule.upperDivisionId] || 0) + rule.relegatedCount;
    }

    for (const [divisionId, slots] of Object.entries(outgoingSlots)) {
        if (slots > (divisionSizes[divisionId] || 0)) {
            return `Kasta ${divisionId} tidak memiliki cukup klub untuk slot promosi dan degradasi yang dipilih.`;
        }
    }
    return "";
}

function getDraftDivisionSizes(draft) {
    const sizes = {};
    draft.forEach((_, index) => {
        const divisionId = Math.floor(index / MAX_TEAMS_PER_DIVISION) + 1;
        sizes[divisionId] = (sizes[divisionId] || 0) + 1;
    });
    return sizes;
}

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatMoney(value) {
    return `Rp ${value >= 1000 ? (value / 1000).toFixed(value % 1000 ? 1 : 0) + " M" : value + " Jt"}`;
}

function getTeam(id) {
    return state.standings.find(team => team.id === id);
}

function setView(view) {
    if (view !== "club") clubViewHistory = [];
    if (view === "archive" && state?.seasonHistory?.length) {
        const latestSeason = [...state.seasonHistory]
            .sort((a, b) => b.season.localeCompare(a.season))[0].season;
        if (!state.seasonHistory.some(archive => archive.season === selectedArchiveSeason)) {
            selectedArchiveSeason = latestSeason;
            archiveMatchPage = 1;
        }
    }
    activeView = view;
    document.querySelectorAll(".nav-item[data-view]").forEach(button => {
        button.classList.toggle("active", button.dataset.view === view);
    });
    const titles = {
        overview: "Ringkasan Liga",
        teams: "Klub Peserta",
        regulations: "Peraturan Federasi",
        calendar: "Kalender Kompetisi",
        records: "Laporan Liga",
        ratings: "Rating Tim",
        archive: "Arsip Musim",
        club: "Detail Klub"
    };
    document.getElementById("pageTitle").textContent = titles[view];
    const currentDivisionWeek = state.divisionProgress?.[activeDivisionId] || 1;
    document.getElementById("seasonLabel").textContent = view === "archive"
        ? (selectedArchiveSeason ? `Arsip Musim ${selectedArchiveSeason}` : "Arsip Musim")
        : `Musim ${state.season} · Kasta ${activeDivisionId} · Pekan ${currentDivisionWeek}`;
    document.getElementById("budgetValue").textContent = formatMoney(state.federationBudget);
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function openClubDetail(teamId) {
    const team = state?.standings.find(item => item.id === Number(teamId));
    if (!team) return;
    if (activeView !== "club" || selectedTeamId !== team.id) {
        clubViewHistory.push({
            view: activeView,
            teamId: selectedTeamId,
            divisionId: activeDivisionId
        });
    }
    selectedTeamId = team.id;
    setView("club");
}

function returnFromClubDetail() {
    const previous = clubViewHistory.pop();
    if (!previous) {
        selectedTeamId = null;
        setView("overview");
        return;
    }
    const previousTeam = previous.view === "club" ? getTeam(previous.teamId) : null;
    const view = previous.view === "club" && !previousTeam ? "overview" : previous.view;
    activeDivisionId = previous.divisionId;
    selectedTeamId = previousTeam ? previousTeam.id : null;
    setView(view);
}

function render() {
    const app = document.getElementById("app");
    if (activeView === "overview") app.innerHTML = renderOverview();
    if (activeView === "club") app.innerHTML = renderClubDetail();
    if (activeView === "teams") app.innerHTML = renderTeams();
    if (activeView === "regulations") app.innerHTML = renderRegulations();
    if (activeView === "calendar") app.innerHTML = renderCalendar();
    if (activeView === "records") app.innerHTML = renderRecords();
    if (activeView === "ratings") app.innerHTML = renderTeamRatings();
    if (activeView === "archive") app.innerHTML = renderSeasonArchive();
    bindViewEvents();
}

function getClubReturnLabel() {
    const previous = clubViewHistory[clubViewHistory.length - 1];
    if (!previous) return "Ringkasan Liga";
    if (previous.view === "club") return getTeam(previous.teamId)?.name || "Detail Klub";
    const labels = {
        overview: "Ringkasan Liga",
        teams: "Klub Peserta",
        regulations: "Peraturan Federasi",
        calendar: "Kalender Kompetisi",
        records: "Laporan Liga",
        ratings: "Rating Tim",
        archive: "Arsip Musim"
    };
    return labels[previous.view] || "menu sebelumnya";
}

function sortedStandings() {
    return [...state.standings]
        .filter(team => team.divisionId === activeDivisionId)
        .sort(compareTableStandings);
}

function getTeamForm(teamId) {
    const matches = state.matchLog
        .filter(match => match.homeId === teamId || match.awayId === teamId)
        .slice(-5);
    return matches.map(match => {
        const isHome = match.homeId === teamId;
        const scored = isHome ? match.homeGoals : match.awayGoals;
        const conceded = isHome ? match.awayGoals : match.homeGoals;
        return scored > conceded ? "W" : scored === conceded ? "D" : "L";
    });
}

function getTeamCards(teamId) {
    let yellow = 0;
    let red = 0;
    state.matchLog
        .filter(match => match.homeId === teamId || match.awayId === teamId)
        .forEach(match => {
            (match.events || []).forEach(event => {
                if (event.teamId !== teamId) return;
                if (event.type === "yellow") yellow += 1;
                if (event.type === "red") red += 1;
            });
        });
    return { yellow, red };
}

function updateGlobalRanking() {
    const ranked = [...state.standings].sort(compareRankingPoints);
    ranked.forEach((team, index) => {
        team.globalRank = index + 1;
    });
}

function compareRankingPoints(a, b) {
    return (b.rankingPoints || 0) - (a.rankingPoints || 0) ||
        (b.rating || 0) - (a.rating || 0);
}

function calculateRankingChange(team, opponent, scored, conceded) {
    if (!Number.isFinite(team.rankingPoints)) team.rankingPoints = 1000;
    const teamRating = team.rankingPoints;
    const opponentRating = opponent.rankingPoints || 1000;
    const expected = 1 / (1 + Math.pow(10, (opponentRating - teamRating) / 400));
    const actual = scored > conceded ? 1 : scored === conceded ? 0.5 : 0;
    const goalDifference = Math.abs(scored - conceded);
    const goalFactor = 1 + Math.min(0.75, goalDifference * 0.18);
    const importance = 12;
    const rawChange = importance * (actual - expected) * goalFactor;
    const change = Math.round(rawChange * 10) / 10;
    team.previousRankingPoints = team.rankingPoints;
    team.rankingPoints = Math.max(500, Math.round((team.rankingPoints + change) * 10) / 10);
    team.rankingChange = Math.round((team.rankingPoints - team.previousRankingPoints) * 10) / 10;
    return team.rankingChange;
}

function getTeamRatingProfile(team) {
    calculateTeamRatings(team);
    const overall = Math.round(
        team.attackRating * 0.32 +
        team.midfieldRating * 0.32 +
        team.defenseRating * 0.36
    );
    const expectation = Math.max(0, Math.min(100,
        50 + (overall - 70) * 1.6 + (team.fitness - 92) * 0.35 + (team.momentum - 50) * 0.12
    ));
    return { overall, winChance: Math.round(expectation) };
}

function getRankingPointsMovement(team) {
    const change = Number(team.rankingChange) || 0;
    if (change > 0) return { arrow: "▲", label: "naik", className: "up" };
    if (change < 0) return { arrow: "▼", label: "turun", className: "down" };
    return { arrow: "—", label: "datar", className: "flat" };
}

function formatRankingChange(team) {
    const change = Number(team.rankingChange) || 0;
    return `${change > 0 ? "+" : ""}${change.toFixed(1)}`;
}

function getRankingChangeClass(team) {
    const change = Number(team.rankingChange) || 0;
    return change > 0 ? "positive" : change < 0 ? "negative" : "neutral";
}

function renderTeamRatings() {
    updateGlobalRanking();
    const teams = [...state.standings].sort(compareRankingPoints);
    return `
        <section class="panel">
            <div class="panel-header">
                <h2>Database Rating Tim</h2>
                <span class="notice">${teams.length} klub · update otomatis</span>
            </div>
            <div class="panel-body rating-directory">
                ${teams.map((team, index) => {
                    const profile = getTeamRatingProfile(team);
                    const movement = getRankingPointsMovement(team);
                    const globalRank = index + 1;
                    return `
                        <article class="rating-team-card">
                            <button class="rating-team-main" data-club-id="${team.id}" type="button">
                                <span class="rating-rank-block">
                                    <span class="ranking-movement ${movement.className}">
                                        <span class="ranking-arrow ${movement.className}">${movement.arrow}</span>
                                    </span>
                                    <span class="global-ranking">${String(globalRank).padStart(2, "0")}</span>
                                    <small class="ranking-points ${getRankingChangeClass(team)}">${formatRankingChange(team)} pts</small>
                                </span>
                                <span class="standing-badge">${escapeHtml(team.short)}</span>
                                <span class="rating-team-name">
                                    <strong>${escapeHtml(team.name)}</strong>
                                    <small>${escapeHtml(state.divisions.find(item => item.id === team.divisionId)?.name || "")} · ${team.fitness}% fitness</small>
                                </span>
                            </button>
                            <div class="rating-score-block">
                                <div class="rating-score"><span>OVR</span><strong>${profile.overall}</strong></div>
                            </div>
                            <div class="rating-bars">
                                ${renderRatingBar("Serangan", team.attackRating)}
                                ${renderRatingBar("Tengah", team.midfieldRating)}
                                ${renderRatingBar("Pertahanan", team.defenseRating)}
                            </div>
                            <div class="rating-momentum">
                                <span>Momentum</span><strong>${team.momentum || 50}</strong>
                                <span>Peluang menang</span><strong>${profile.winChance}%</strong>
                            </div>
                        </article>`;
                }).join("")}
            </div>
        </section>`;
}

function renderRatingBar(label, value) {
    const width = Math.max(0, Math.min(100, (value - 50) * 2));
    return `<div class="rating-bar">
        <div><span>${label}</span><strong>${value}</strong></div>
        <div class="rating-track"><span style="width:${width}%"></span></div>
    </div>`;
}

function getMovementZone(index, divisionTeamCount) {
    const rule = (state.rules?.divisionMovements || [])
        .find(item =>
            item.upperDivisionId === activeDivisionId ||
            item.lowerDivisionId === activeDivisionId);
    if (!rule) return "";
    if (activeDivisionId > 1 && index < (rule.promotedCount || 0)) return "promotion";
    if (activeDivisionId < state.divisions.length &&
        index >= divisionTeamCount - (rule.relegatedCount || 0)) return "relegation";
    return "";
}

function renderOverview() {
    const sorted = sortedStandings();
    const seasonComplete = isSeasonComplete();
    const hasPlayoffRules = (state.rules.divisionMovements || [])
        .some(rule => rule.mode === "internal_playoff" || rule.mode === "cross_playoff");
    const activeMatchLog = state.matchLog.filter(match =>
        match.divisionId === activeDivisionId);
    const playedWeeks = new Set(activeMatchLog.map(match => match.week)).size;
    const divisionFixtures = state.fixtures.filter(match =>
        match.divisionId === activeDivisionId);
    const totalWeeks = Math.max(1, ...divisionFixtures.map(match => match.week));
    const seasonProgress = Math.round((playedWeeks / totalWeeks) * 100);
    const latest = state.matchLog.filter(match => !match.divisionId || match.divisionId === activeDivisionId).slice(-4).reverse();
    const activeDivision = state.divisions.find(item => item.id === activeDivisionId) || state.divisions[0];
    const divisionTeams = state.standings.filter(team => team.divisionId === activeDivisionId);
    const divisionWeek = state.divisionProgress?.[activeDivisionId] || 1;
    const divisionTotalWeeks = Math.max(1, ...divisionFixtures.map(match => match.week));

    return `
        <div class="division-tabs" aria-label="Pilih kasta">
            ${state.divisions.map(division => `
                <button class="division-tab ${division.id === activeDivisionId ? "active" : ""}" data-division="${division.id}">
                    ${escapeHtml(division.name)} <span>${state.standings.filter(team => team.divisionId === division.id).length}</span>
                </button>`).join("")}
        </div>
        <div class="grid grid-overview">
            <section class="panel federation-hero">
                <div class="crest">LN</div>
                <div>
                    <p class="eyebrow">Kompetisi Nasional</p>
                    <h2>${escapeHtml(state.leagueName)}</h2>
                    <div class="club-meta">Dikelola oleh Asosiasi Organisasi Sepak Bola</div>
                    <div class="stat-row">
                        <div class="stat"><span>Klub ${activeDivision.name}</span><strong>${divisionTeams.length}</strong></div>
                        <div class="stat"><span>Reputasi</span><strong>${state.reputation}</strong></div>
                        <div class="stat"><span>Pertandingan</span><strong>${activeMatchLog.length}</strong></div>
                        <div class="stat"><span>Progres</span><strong>${seasonProgress}%</strong></div>
                    </div>
                </div>
            </section>
            <section class="panel next-match">
                <div class="panel-header"><h2>Kendali Liga</h2><span class="notice">${state.rules.transferWindow}</span></div>
                <div class="panel-body">
                    <p class="notice">Simulasikan seluruh pertandingan ${activeDivision.name} pada pekan ${divisionWeek}.</p>
                    <button class="primary-button" id="simulateWeek" style="width:100%" ${divisionWeek > divisionTotalWeeks ? "disabled" : ""}>
                        ${divisionWeek > divisionTotalWeeks ? "Musim Selesai" : `Simulasikan Pekan ${divisionWeek}`}
                    </button>
                    ${seasonComplete && state.pendingSeasonTransition ? `
                        <button class="secondary-button" id="startNextSeason" style="width:100%;margin-top:8px">Konfirmasi & Mulai Musim Baru</button>
                    ` : seasonComplete ? `
                        <button class="secondary-button" id="processSeasonEnd" style="width:100%;margin-top:8px">${hasPlayoffRules ? "Proses Akhir Musim & Simulasikan Play-off" : "Proses Promosi & Degradasi"}</button>
                    ` : `
                        <button class="secondary-button" id="lockedEditorButton" style="width:100%;margin-top:8px" disabled>🔒 Editor tim terkunci selama musim</button>
                    `}
                </div>
            </section>
            ${seasonComplete && state.pendingSeasonTransition ? renderSeasonTransitionSummary() : ""}
            ${renderPlayerLifecycleSummary(activeDivisionId)}
            <section class="panel">
                <div class="panel-header"><h2>Klasemen Liga</h2><button class="secondary-button" data-go="calendar">Kalender</button></div>
                ${renderBroadcastTable(sorted)}
            </section>
            <section class="panel">
                <div class="panel-header"><h2>Hasil Terbaru</h2></div>
                <div class="panel-body">
                    ${latest.length ? latest.map(match => `
                        <div class="list-row">
                            <div class="shirt">${match.homeGoals}-${match.awayGoals}</div>
                            <div class="player-name"><strong>${escapeHtml(match.homeShort)} — ${escapeHtml(match.awayShort)}</strong><small>Pekan ${match.week}</small></div>
                            <div class="rating">${match.homeGoals + match.awayGoals}</div>
                        </div>`).join("") : `<p class="notice">Belum ada pertandingan dimainkan.</p>`}
                </div>
            </section>
        </div>`;
}

function renderPlayerLifecycleSummary(divisionId) {
    const report = state.lastPlayerLifecycle;
    if (!report) return "";
    const clubReports = report.clubs.filter(club => getTeam(club.teamId)?.divisionId === divisionId);
    const growth = clubReports.flatMap(club => club.growth.map(player => ({
        type: "OVR naik",
        detail: `${player.name} (${club.teamName}) · ${player.from} → ${player.to}`,
        className: "growth"
    })));
    const declines = clubReports.flatMap(club => club.declines.map(player => ({
        type: "OVR turun",
        detail: `${player.name} (${club.teamName}) · ${player.from} → ${player.to}`,
        className: "decline"
    })));
    const retirements = clubReports.flatMap(club => club.retirements.map(player => ({
        type: "Pensiun",
        detail: `${player.name} (${club.teamName}) · usia ${player.age}`,
        className: "retirement"
    })));
    const arrivals = clubReports.flatMap(club => club.arrivals.map(player => ({
        type: player.replacementFor ? "Regenerasi" : "Pemain akademi",
        detail: `${player.name} (${club.teamName}) · ${player.role}, usia ${player.age} · ${player.reason || "Memenuhi kebutuhan skuad"}`,
        className: "arrival"
    })));
    const activities = [...growth, ...declines, ...retirements, ...arrivals].slice(0, 6);
    const count = key => clubReports.reduce((total, club) => total + club[key].length, 0);

    return `
        <section class="panel player-lifecycle-summary">
            <div class="panel-header">
                <h2>Perkembangan Pemain</h2>
                <span class="notice">Setelah musim ${escapeHtml(report.season)} · ${escapeHtml(state.divisions.find(item => item.id === divisionId)?.name || "")}</span>
            </div>
            <div class="panel-body">
                <div class="player-lifecycle-stats">
                    <div><span>OVR naik</span><strong>${count("growth")}</strong></div>
                    <div><span>OVR turun</span><strong>${count("declines")}</strong></div>
                    <div><span>Pensiun</span><strong>${count("retirements")}</strong></div>
                    <div><span>Pemain baru</span><strong>${count("arrivals")}</strong></div>
                </div>
                ${activities.length ? `<div class="player-lifecycle-events">
                    ${activities.map(activity => `
                        <div class="player-lifecycle-event ${activity.className}">
                            <strong>${escapeHtml(activity.type)}</strong>
                            <span>${escapeHtml(activity.detail)}</span>
                        </div>`).join("")}
                </div>` : `<p class="notice">Belum ada perubahan pemain di kasta ini.</p>`}
            </div>
        </section>`;
}

function renderSeasonTransitionSummary() {
    const transition = state.pendingSeasonTransition;
    return `
        <section class="panel season-transition-summary">
            <div class="panel-header">
                <h2>Hasil Akhir Musim ${escapeHtml(transition.season)}</h2>
                <span class="notice">Tinjau sebelum melanjutkan</span>
            </div>
            <div class="panel-body">
                <h3>Hasil play-off</h3>
                ${transition.playoffs.length ? transition.playoffs.map(playoff => `
                    <article class="playoff-history-card">
                        <div class="playoff-history-heading">
                            <span>${escapeHtml(playoff.type)}</span>
                            <strong>${escapeHtml(playoff.teamAName)} vs ${escapeHtml(playoff.teamBName)}</strong>
                        </div>
                        <div class="playoff-leg-scores">
                            ${playoff.legs.map((leg, index) => {
                                const home = getTeam(leg.homeId);
                                const away = getTeam(leg.awayId);
                                return `<span>Leg ${index + 1}: ${escapeHtml(home?.short || "?")} ${leg.homeGoals} — ${leg.awayGoals} ${escapeHtml(away?.short || "?")}</span>`;
                            }).join("")}
                            ${playoff.extraTime ? `<span>Perpanjangan waktu: ${playoff.extraTime.teamAGoals} — ${playoff.extraTime.teamBGoals}</span>` : ""}
                            ${playoff.penalties ? `<span>Adu penalti (${escapeHtml(playoff.teamAName)} — ${escapeHtml(playoff.teamBName)}): ${playoff.penalties.teamAGoals}/${playoff.penalties.teamAAttempts} — ${playoff.penalties.teamBGoals}/${playoff.penalties.teamBAttempts}</span>` : ""}
                        </div>
                        <div class="playoff-result">
                            <strong>${playoff.extraTime ? "Skor akhir" : "Agregat"} ${playoff.finalTeamATotal} — ${playoff.finalTeamBTotal}</strong>
                            <span>Pemenang: ${escapeHtml(playoff.winnerName)}</span>
                        </div>
                    </article>`).join("") : '<p class="notice">Tidak ada play-off pada musim ini.</p>'}
                <h3>Pergerakan divisi</h3>
                ${transition.movements.length ? transition.movements.map(movement => {
                    const team = getTeam(movement.teamId);
                    return `<div class="list-row">
                        <div class="shirt">${movement.to < movement.from ? "↑" : "↓"}</div>
                        <div class="player-name">
                            <strong>${escapeHtml(team?.name || "Klub")}</strong>
                            <small>${escapeHtml(movement.type)} · Kasta ${movement.from} → Kasta ${movement.to}</small>
                        </div>
                    </div>`;
                }).join("") : '<p class="notice">Tidak ada perpindahan divisi yang diatur.</p>'}
                <p class="notice">Jumlah klub tiap kasta akan tetap seimbang. Setelah konfirmasi, jadwal musim baru akan dibuat.</p>
            </div>
        </section>`;
}

function renderBroadcastTable(sorted) {
    const movementRule = (state.rules?.divisionMovements || [])
        .find(item =>
            item.upperDivisionId === activeDivisionId ||
            item.lowerDivisionId === activeDivisionId);
    const promotionCount = activeDivisionId > 1
        ? Number(movementRule?.promotedCount || 0)
        : 0;
    const relegationCount = activeDivisionId < state.divisions.length
        ? Number(movementRule?.relegatedCount || 0)
        : 0;

    return `
        <div class="broadcast-scroll">
        <div class="broadcast-table" role="table" aria-label="Klasemen liga">
            <div class="broadcast-header" role="row">
                <span>#</span><span>Klub</span><span title="Main">M</span><span title="Menang">W</span>
                <span title="Seri">D</span><span title="Kalah">L</span><span title="Gol untuk">GF</span>
                <span title="Gol kebobolan">GA</span><span title="Gol difference / selisih gol">GD</span><span title="Poin">Pts</span>
                <span>Form</span><span title="Kartu kuning / kartu merah">Cards</span>
            </div>
            ${sorted.map((team, index) => {
                const form = getTeamForm(team.id);
                const cards = getTeamCards(team.id);
                const previousRank = Number(team.previousDivisionRank) || index + 1;
                const rankChange = previousRank - index - 1;
                const rankMovement = rankChange > 0
                    ? { arrow: "▲", amount: rankChange, className: "up", label: `Naik ${rankChange} posisi` }
                    : rankChange < 0
                        ? { arrow: "▼", amount: Math.abs(rankChange), className: "down", label: `Turun ${Math.abs(rankChange)} posisi` }
                        : { arrow: "—", amount: "", className: "flat", label: "Posisi tetap" };
                const zone = index < promotionCount
                    ? "promotion"
                    : index >= sorted.length - relegationCount
                        ? "relegation"
                        : "";
                return `
                    <div class="broadcast-row ${zone}" role="row">
                        <div class="standing-position">
                            <span class="standing-movement ${rankMovement.className}" title="${rankMovement.label}" aria-label="${rankMovement.label}">${rankMovement.arrow}${rankMovement.amount || ""}</span>
                            <span>${index + 1}</span>
                        </div>
                        <button class="standing-club" data-club-id="${team.id}" type="button">
                            <span class="standing-badge">${escapeHtml(team.short)}</span>
                            <span><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(team.city)} · Rating ${team.rating}</small></span>
                        </button>
                        <div>${team.p}</div><div>${team.w}</div><div>${team.d}</div><div>${team.l}</div>
                        <div>${team.gf}</div><div>${team.ga}</div>
                        <div class="${team.gf - team.ga >= 0 ? "positive" : "negative"}">${team.gf - team.ga >= 0 ? "+" : ""}${team.gf - team.ga}</div>
                        <strong class="standing-points">${team.pts}</strong>
                        <div class="form-results">${form.length ? form.map(result =>
                            `<span class="form-${result.toLowerCase()}">${result}</span>`).join("") : '<span class="form-empty">—</span>'}</div>
                        <div class="standing-cards"><span class="yellow-card">${cards.yellow}</span><span class="red-card">${cards.red}</span></div>
                    </div>`;
            }).join("")}
        </div>
        </div>
        <div class="table-legend">
            ${promotionCount ? '<span><i class="legend-promotion"></i>Zona promosi</span>' : ""}
            ${relegationCount ? '<span><i class="legend-relegation"></i>Zona degradasi</span>' : ""}
            ${!promotionCount && !relegationCount ? '<span><i class="legend-neutral"></i>Klasemen liga</span>' : ""}
        </div>`;
}

function renderAiDecisionReport(match, side, teamName) {
    const decision = match.aiDecision?.[side];
    const lineup = match.lineup?.[side];
    if (!decision || !Array.isArray(lineup) || !lineup.length) return "";
    const starters = lineup.map(player => {
        const explanation = player.reason === "fitness-rotation" && player.comparison
            ? `Rotasi kebugaran: ${player.fitness}% mengungguli ${player.comparison.name} (${player.comparison.rating} OVR, ${player.comparison.fitness}%).`
            : "Nilai gabungan OVR dan kebugaran tertinggi di kelompok posisi.";
        return `<div class="ai-lineup-player">
            <span class="lineup-role">${escapeHtml(player.role)}</span>
            <div><strong>${escapeHtml(player.name)}</strong><small>OVR ${player.rating} · Kebugaran ${player.fitness}%</small></div>
            <p>${escapeHtml(explanation)}</p>
        </div>`;
    }).join("");
    const rested = (decision.rested || []).map(player => `
        <span>${escapeHtml(player.name)} · ${escapeHtml(player.role)} · ${player.fitness}% · ${
            player.reason === "recovery" ? "diistirahatkan untuk pemulihan" : "pelapis untuk menjaga kedalaman"
        }</span>`).join("");

    return `<details class="club-match-ai">
        <summary>Keputusan AI · ${escapeHtml(teamName)} · ${escapeHtml(decision.formation)} · ${decision.rotationCount} rotasi kebugaran</summary>
        <p class="ai-report-note">AI menilai OVR dan kebugaran untuk mengisi formasi. Pemain inti kehilangan ${STARTING_FITNESS_COST}% kebugaran, sedangkan pemain yang tidak tampil pulih ${BENCH_FITNESS_RECOVERY}%.</p>
        <div class="ai-lineup-list">${starters}</div>
        ${decision.restedCount ? `<div class="ai-rest-report">
            <strong>${decision.restedCount} pemain tidak diturunkan · ${decision.lowFitnessRestedCount} perlu pemulihan</strong>
            ${rested}
        </div>` : `<p class="ai-report-note">Tidak ada pemain cadangan yang tersedia.</p>`}
    </details>`;
}

function renderClubDetail() {
    const team = state.standings.find(item => item.id === selectedTeamId);
    if (!team) {
        activeView = "overview";
        return renderOverview();
    }
    const divisionStandings = state.standings
        .filter(candidate => candidate.divisionId === team.divisionId)
        .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
    const divisionRank = divisionStandings.findIndex(candidate => candidate.id === team.id) + 1;
    const clubMatches = state.matchLog
        .filter(match => match.homeId === team.id || match.awayId === team.id)
        .slice(-8)
        .reverse();
    const cards = getTeamCards(team.id);
    const form = getTeamForm(team.id);
    const teamProfile = getTeamRatingProfile(team);
    const lineup = selectStartingLineup(team).slice(0, 11);
    const roster = [...team.squad].sort((a, b) =>
        PLAYER_ROLES.indexOf(a.role) - PLAYER_ROLES.indexOf(b.role) ||
        b.rating - a.rating
    );
    const retiredPlayers = (state.playerRetirementHistory || [])
        .filter(player => player.teamId === team.id)
        .slice(-5)
        .reverse();

    return `
        <button class="back-button club-detail-back" type="button" id="clubDetailBack">← Kembali ke ${escapeHtml(getClubReturnLabel())}</button>
        <div class="club-detail-grid">
            <section class="panel club-profile">
                <div class="club-profile-header">
                    <div class="team-badge club-profile-badge">${escapeHtml(team.short)}</div>
                    <div>
                        <p class="eyebrow">${escapeHtml(team.city)} · Rating ${team.rating}</p>
                        <h2>${escapeHtml(team.name)}</h2>
                        <span class="notice">${escapeHtml(state.divisions.find(item => item.id === team.divisionId)?.name || "")}</span>
                        <div class="club-ranking-line">
                            <strong>#${divisionRank || "-"}</strong>
                            <span class="club-ranking-total">${Number(team.rankingPoints || 0).toFixed(1)} pts</span>
                        </div>
                    </div>
                </div>
                <div class="panel-body club-profile-stats">
                    <div><span>Poin</span><strong>${team.pts}</strong></div>
                    <div><span>Main</span><strong>${team.p}</strong></div>
                    <div><span>Menang</span><strong>${team.w}</strong></div>
                    <div><span>Seri</span><strong>${team.d}</strong></div>
                    <div><span>Kalah</span><strong>${team.l}</strong></div>
                    <div><span>GF / GA</span><strong>${team.gf} / ${team.ga}</strong></div>
                    <div><span>Kartu kuning</span><strong>${cards.yellow}</strong></div>
                    <div><span>Kartu merah</span><strong>${cards.red}</strong></div>
                    <div><span>Overall tim</span><strong>${teamProfile.overall}</strong></div>
                    <div><span>Serangan / Tengah</span><strong>${team.attackRating} / ${team.midfieldRating}</strong></div>
                    <div><span>Pertahanan</span><strong>${team.defenseRating}</strong></div>
                    <div><span>Peluang menang</span><strong>${teamProfile.winChance}%</strong></div>
                </div>
            </section>
            <section class="panel club-form-panel">
                <div class="panel-header"><h2>Form Terakhir</h2></div>
                <div class="panel-body club-form">${form.length
                    ? form.map(result => `<span class="form-${result.toLowerCase()}">${result}</span>`).join("")
                    : '<span class="notice">Belum ada pertandingan</span>'}</div>
            </section>
            <section class="panel club-lineup-panel">
                <div class="panel-header"><h2>Lineup Inti AI</h2><span class="notice">OVR + kebugaran</span></div>
                <div class="panel-body lineup-list">
                    ${lineup.map(player => `
                        <div class="lineup-player">
                            <span class="lineup-role">${player.role}</span>
                            <strong>${escapeHtml(player.name)}</strong>
                            <span>${player.rating} · ${player.fitness}%</span>
                        </div>`).join("")}
                </div>
            </section>
            <section class="panel club-squad-panel">
                <div class="panel-header">
                    <h2>Skuad & Perkembangan</h2>
                    <span class="notice">${roster.length}/${Math.max(11, Number(state.rules.squadLimit) || 25)} pemain</span>
                </div>
                <div class="panel-body squad-list">
                    ${roster.map(player => {
                        const change = Number(player.lastSeasonChange) || 0;
                        const trend = change > 0
                            ? { symbol: "▲", label: `+${change}`, className: "growth" }
                            : change < 0
                                ? { symbol: "▼", label: String(change), className: "decline" }
                                : { symbol: "—", label: "0", className: "steady" };
                        return `<div class="squad-player-row">
                            <span class="lineup-role">${escapeHtml(player.role)}</span>
                            <div class="squad-player-info">
                                <strong>${escapeHtml(player.name)}</strong>
                                <small>Usia ${player.age} · Kebugaran ${player.fitness}% · Potensi ${player.potential}</small>
                            </div>
                            <strong class="squad-player-rating">${player.rating}</strong>
                            <span class="squad-player-change ${trend.className}" aria-label="Perubahan OVR">${trend.symbol} ${trend.label}</span>
                        </div>`;
                    }).join("")}
                </div>
                ${retiredPlayers.length ? `
                    <div class="retirement-history">
                        <strong>Pensiun dari klub ini</strong>
                        ${retiredPlayers.map(player => `<span>${escapeHtml(player.name)} · usia ${player.age} · musim ${escapeHtml(player.season)}</span>`).join("")}
                    </div>` : ""}
            </section>
            <section class="panel club-history-panel">
                <div class="panel-header">
                    <h2>Riwayat Pertandingan</h2>
                    <div class="match-result-legend">
                        <span class="legend-win">Menang</span>
                        <span class="legend-draw">Seri</span>
                        <span class="legend-loss">Kalah</span>
                        <small>H = kandang · A = tandang</small>
                    </div>
                </div>
                <div class="panel-body">
                    ${clubMatches.length ? clubMatches.map(match => {
                        const isHome = match.homeId === team.id;
                        const opponentId = isHome ? match.awayId : match.homeId;
                        const opponent = getTeam(opponentId);
                        const opponentScore = isHome ? match.awayGoals : match.homeGoals;
                        const clubScore = isHome ? match.homeGoals : match.awayGoals;
                        const matchResult = clubScore > opponentScore
                            ? "MENANG"
                            : clubScore === opponentScore
                                ? "SERI"
                                : "KALAH";
                        const resultClass = matchResult.toLowerCase();
                        const venue = isHome ? "H" : "A";
                        return `<div class="club-match-row ${resultClass}">
                            <span class="match-result-badge ${resultClass}">${matchResult}</span>
                            <span>Pekan ${match.week}</span>
                            ${opponent
                                ? `<button class="club-opponent-link" data-club-id="${opponent.id}" type="button">${escapeHtml(opponent.name)}</button>`
                                : `<strong>Lawan</strong>`}
                            <span class="match-venue">${venue}</span>
                            <div><span class="club-score">${clubScore}</span><small>—</small><span class="opponent-score">${opponentScore}</span></div>
                        </div>
                        ${match.stats ? `
                            <div class="club-match-stats">
                                <span>Penguasaan ${isHome ? match.stats.possessionHome : match.stats.possessionAway}%</span>
                                <span>Tembakan ${isHome ? match.stats.shotsHome : match.stats.shotsAway}</span>
                                <span>xG ${isHome ? match.stats.xgHome : match.stats.xgAway}</span>
                            </div>` : ""}
                        ${match.events ? `
                            <div class="club-match-events">
                                ${(match.events || [])
                                    .filter(event => event.teamId === team.id)
                                    .slice(0, 6)
                                    .map(event => `<span>${event.minute}' · ${event.type === "goal" ? "⚽" : event.type === "assist" ? "🅰️" : event.type === "red" ? "🟥" : "🟨"} ${escapeHtml(event.playerName || event.detail)}</span>`)
                                    .join("") || '<span>Tidak ada event signifikan</span>'}
                            </div>` : ""}
                        ${renderAiDecisionReport(match, isHome ? "home" : "away", team.name)}`;
                    }).join("") : '<p class="notice">Belum ada pertandingan dimainkan.</p>'}
                </div>
            </section>
        </div>`;
}

function renderTeams() {
    return `
        <section class="panel">
            <div class="panel-header"><h2>Daftar Klub Peserta</h2><span class="notice">${state.standings.length} klub · ${state.divisions.length} kasta</span></div>
            ${state.divisions.map(division => `
                <div class="panel-body division-team-section">
                    <div class="division-team-heading"><h3>${escapeHtml(division.name)}</h3><span>${state.standings.filter(team => team.divisionId === division.id).length} klub</span></div>
                    <div class="team-grid">
                        ${state.standings.filter(team => team.divisionId === division.id).sort((a, b) => b.rating - a.rating).map(team => `
                            <button class="team-card team-card-button" data-club-id="${team.id}" type="button">
                                <div class="team-badge">${escapeHtml(team.short)}</div>
                                <div><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(team.city)} · Rating ${team.rating}</small></div>
                                <div class="team-card-stats">
                                    <span><small>Fans</small><strong>${team.fans}K</strong></span>
                                    <span><small>Budget</small><strong>${formatMoney(team.budget)}</strong></span>
                                </div>
                            </button>`).join("")}
                    </div>
                </div>`).join("")}
        </section>`;
}

function renderRegulations() {
    const rules = state.rules;
    return `
        <div class="grid" style="grid-template-columns:minmax(0,1.4fr) 330px">
            <section class="panel">
                <div class="panel-header"><h2>Undang-Undang Kompetisi</h2><span class="notice">Edisi ${state.season}</span></div>
                <div class="panel-body rules-grid">
                    ${[
                        ["01", "Sistem Poin", `Kemenangan ${rules.pointsWin} · Seri ${rules.pointsDraw} · Kalah 0`],
                        ["02", "Pemain Asing", `Maksimal ${rules.foreignPlayers} pemain asing per tim`],
                        ["03", "Batas Skuad", `Maksimal ${rules.squadLimit} pemain terdaftar`],
                        ["04", "Disiplin", `Standar sanksi: ${rules.discipline}`],
                        ["05", "Bursa Transfer", `Status: ${rules.transferWindow}`],
                        ["06", "Keuntungan Tuan Rumah", `Level: ${rules.homeAdvantage}`]
                    ].map(item => `<article class="rule-card"><span>${item[0]}</span><div><strong>${item[1]}</strong><small>${item[2]}</small></div></article>`).join("")}
                </div>
            </section>
            <section class="panel">
                <div class="panel-header"><h2>Editor Peraturan</h2></div>
                <div class="panel-body">
                    <label class="notice">Poin kemenangan</label>
                    <select id="pointsWin" class="secondary-button rule-select">${[2,3,4].map(n => `<option ${rules.pointsWin === n ? "selected" : ""}>${n}</option>`).join("")}</select>
                    <label class="notice">Poin seri</label>
                    <select id="pointsDraw" class="secondary-button rule-select">${[0,1,2].map(n => `<option ${rules.pointsDraw === n ? "selected" : ""}>${n}</option>`).join("")}</select>
                    <label class="notice">Pemain asing</label>
                    <select id="foreignPlayers" class="secondary-button rule-select">${[3,4,5,6].map(n => `<option ${rules.foreignPlayers === n ? "selected" : ""}>${n}</option>`).join("")}</select>
                    <label class="notice">Keuntungan kandang</label>
                    <select id="homeAdvantage" class="secondary-button rule-select">${["Rendah", "Normal", "Tinggi"].map(n => `<option ${rules.homeAdvantage === n ? "selected" : ""}>${n}</option>`).join("")}</select>
                    <label class="notice">Status transfer</label>
                    <select id="transferWindow" class="secondary-button rule-select">${["Tertutup", "Terbuka"].map(n => `<option ${rules.transferWindow === n ? "selected" : ""}>${n}</option>`).join("")}</select>
                    <label class="notice">Standar disiplin</label>
                    <select id="discipline" class="secondary-button rule-select">${["Ringan", "Standar", "Ketat"].map(n => `<option ${rules.discipline === n ? "selected" : ""}>${n}</option>`).join("")}</select>
                    <button class="primary-button" id="saveRules" style="width:100%">Terapkan Peraturan</button>
                </div>
            </section>
        </div>`;
}

function renderCalendar() {
    const weeks = [];
    const divisionFixtures = state.fixtures.filter(match => match.divisionId === activeDivisionId);
    const totalWeeks = Math.max(...divisionFixtures.map(match => match.week));
    const divisionWeek = state.divisionProgress?.[activeDivisionId] || 1;
    for (let week = 1; week <= totalWeeks; week++) {
        weeks.push({ week, fixtures: divisionFixtures.filter(match => match.week === week) });
    }
    return `
        <section class="panel">
            <div class="panel-header"><h2>Jadwal ${totalWeeks} Pekan</h2><span class="notice">${state.matchLog.filter(match => match.divisionId === activeDivisionId).length} pertandingan selesai</span></div>
            <div class="division-tabs calendar-tabs">
                ${state.divisions.map(division => `
                    <button class="division-tab ${division.id === activeDivisionId ? "active" : ""}" data-division="${division.id}">
                        ${escapeHtml(division.name)}
                    </button>`).join("")}
            </div>
            <div class="panel-body calendar-list">
                ${weeks.map(({ week, fixtures }) => `
                    <article class="week-card ${week === divisionWeek ? "current" : ""}">
                        <div class="week-title"><strong>Pekan ${week}</strong><span>${week < divisionWeek ? "Selesai" : week === divisionWeek ? "Berikutnya" : "Terjadwal"}</span></div>
                        ${fixtures.map(match => {
                            const home = getTeam(match.homeId);
                            const away = getTeam(match.awayId);
                            return `<div class="calendar-match"><strong>${escapeHtml(home.short)}</strong><span>${match.played ? `${match.homeGoals} — ${match.awayGoals}` : "vs"}</span><strong>${escapeHtml(away.short)}</strong></div>`;
                        }).join("")}
                    </article>`).join("")}
            </div>
        </section>`;
}

function renderPlayerLeaderboard() {
    const categories = PLAYER_LEADERBOARD_CATEGORIES;
    const category = categories.find(item => item.id === playerLeaderboardCategory) || categories[0];
    if (playerLeaderboardDivisionId !== "all" &&
        !state.divisions.some(division => division.id === Number(playerLeaderboardDivisionId))) {
        playerLeaderboardDivisionId = "all";
    }
    const rows = state.standings
        .filter(team =>
            playerLeaderboardDivisionId === "all" ||
            team.divisionId === Number(playerLeaderboardDivisionId))
        .flatMap(team => team.squad.map(player => ({
            id: player.id,
            name: player.name,
            role: player.role,
            teamName: team.name,
            divisionId: team.divisionId,
            appearances: Number(player.appearances) || 0,
            rating: Number(player.rating) || 0,
            value: Number(player[category.id]) || 0
        })))
        .sort((a, b) =>
            b.value - a.value ||
            b.appearances - a.appearances ||
            b.rating - a.rating ||
            a.name.localeCompare(b.name)
        );
    let rank = 0;
    rows.forEach((row, index) => {
        if (index === 0 || row.value !== rows[index - 1].value) rank = index + 1;
        row.rank = rank;
    });

    const pageCount = Math.max(1, Math.ceil(rows.length / PLAYER_LEADERBOARD_PAGE_SIZE));
    playerLeaderboardPage = Math.max(1, Math.min(playerLeaderboardPage, pageCount));
    const pageStart = (playerLeaderboardPage - 1) * PLAYER_LEADERBOARD_PAGE_SIZE;
    const pageRows = rows.slice(pageStart, pageStart + PLAYER_LEADERBOARD_PAGE_SIZE);

    return `
        <section class="panel player-leaderboard" style="grid-column:1/-1">
            <div class="panel-header">
                <div><h2>Leaderboard Pemain · ${escapeHtml(category.label)}</h2><span class="notice">${rows.length} pemain · Musim ${escapeHtml(state.season)}</span></div>
                <div class="leaderboard-controls">
                    <label>Kategori
                        <select id="playerLeaderboardCategory" class="secondary-button">
                            ${categories.map(item => `<option value="${item.id}" ${item.id === category.id ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
                        </select>
                    </label>
                    <label>Kasta
                        <select id="playerLeaderboardDivision" class="secondary-button">
                            <option value="all" ${playerLeaderboardDivisionId === "all" ? "selected" : ""}>Semua kasta</option>
                            ${state.divisions.map(division => `<option value="${division.id}" ${playerLeaderboardDivisionId === String(division.id) ? "selected" : ""}>${escapeHtml(division.name)}</option>`).join("")}
                        </select>
                    </label>
                </div>
            </div>
            <div class="archive-table-scroll">
                <table class="season-archive-table player-leaderboard-table">
                    <thead><tr><th>#</th><th>Pemain</th><th>Pos</th><th>Klub</th><th>Kasta</th><th>Main</th><th>${escapeHtml(category.label)}</th></tr></thead>
                    <tbody>
                        ${pageRows.map(player => `
                            <tr class="player-leaderboard-row" data-player-id="${escapeHtml(player.id)}">
                                <td>${player.rank}</td>
                                <td><strong>${escapeHtml(player.name)}</strong></td>
                                <td>${escapeHtml(player.role)}</td>
                                <td>${escapeHtml(player.teamName)}</td>
                                <td>${escapeHtml(state.divisions.find(division => division.id === player.divisionId)?.name || "")}</td>
                                <td>${player.appearances}</td>
                                <td><strong>${player.value}</strong></td>
                            </tr>`).join("") || '<tr><td colspan="7" class="archive-empty-cell">Belum ada pemain untuk kasta ini.</td></tr>'}
                    </tbody>
                </table>
            </div>
            <div class="archive-pagination">
                <button class="secondary-button" id="playerLeaderboardPrevious" type="button" ${playerLeaderboardPage === 1 ? "disabled" : ""}>Sebelumnya</button>
                <span>Halaman ${playerLeaderboardPage} / ${pageCount}</span>
                <button class="secondary-button" id="playerLeaderboardNext" type="button" ${playerLeaderboardPage === pageCount ? "disabled" : ""}>Berikutnya</button>
            </div>
        </section>`;
}

function renderRecords() {
    const sorted = sortedStandings();
    const divisionTeams = state.standings.filter(team => team.divisionId === activeDivisionId);
    const bestAttack = [...divisionTeams].sort((a, b) => b.gf - a.gf)[0];
    const bestDefense = [...divisionTeams].sort((a, b) => a.ga - b.ga)[0];
    const movements = (state.lastMovements || []).filter(movement =>
        movement.from === activeDivisionId || movement.to === activeDivisionId);
    const playoffs = (state.playoffHistory || state.lastPlayoffs || []).filter(playoff =>
        playoff.upperDivisionId === activeDivisionId ||
        playoff.lowerDivisionId === activeDivisionId);
    const aiMatches = state.matchLog
        .filter(match => match.divisionId === activeDivisionId && match.aiDecision)
        .slice(-5)
        .reverse();
    return `
        <div class="grid grid-overview">
            <section class="panel">
                <div class="panel-header"><h2>Ringkasan Musim</h2></div>
                <div class="panel-body stat-row" style="grid-template-columns:repeat(3,1fr)">
                    <div class="stat"><span>Pertandingan</span><strong>${state.matchLog.filter(match => match.divisionId === activeDivisionId).length}</strong></div>
                    <div class="stat"><span>Serangan Terbaik</span><strong>${bestAttack.gf}</strong></div>
                    <div class="stat"><span>Kebobolan Terendah</span><strong>${bestDefense.ga}</strong></div>
                </div>
            </section>
            <section class="panel">
                <div class="panel-header"><h2>Juara Sementara</h2></div>
                <div class="club-hero" style="min-height:170px">
                    <div class="crest">${escapeHtml(sorted[0].short)}</div>
                    <div><p class="eyebrow">Posisi 1</p><h2>${escapeHtml(sorted[0].name)}</h2><div class="club-meta">${sorted[0].pts} poin · ${sorted[0].gf} gol</div></div>
                </div>
            </section>
            <section class="panel" style="grid-column:1/-1">
                <div class="panel-header"><h2>Pergerakan Antar Kasta</h2><span class="notice">${escapeHtml(state.lastMovementSeason || "Belum diproses")}</span></div>
                <div class="panel-body">
                    ${movements.length ? movements.map(movement => {
                        const team = state.standings.find(item => item.id === movement.teamId);
                        const isPromotion = movement.type.startsWith("Promosi");
                        return `<div class="list-row">
                            <div class="shirt">${isPromotion ? "↑" : "↓"}</div>
                            <div class="player-name"><strong>${escapeHtml(team?.name || "Tim")}</strong><small>${movement.type} · Kasta ${movement.from} → Kasta ${movement.to}</small></div>
                            <div class="rating">${isPromotion ? "UP" : "DN"}</div>
                        </div>`;
                    }).join("") : `<p class="notice">Belum ada pergerakan antar kasta atau liga hanya memiliki satu kasta.</p>`}
                </div>
            </section>
            <section class="panel" style="grid-column:1/-1">
                <div class="panel-header"><h2>Riwayat Play-off</h2><span class="notice">Arsip lintas musim</span></div>
                <div class="panel-body playoff-history">
                    ${playoffs.length ? playoffs.map(playoff => {
                        const finalTeamATotal = Number.isFinite(playoff.finalTeamATotal)
                            ? playoff.finalTeamATotal : playoff.teamATotal;
                        const finalTeamBTotal = Number.isFinite(playoff.finalTeamBTotal)
                            ? playoff.finalTeamBTotal : playoff.teamBTotal;
                        return `
                        <article class="playoff-history-card">
                            <div class="playoff-history-heading">
                                <span>${escapeHtml(playoff.season || state.season)} · ${escapeHtml(playoff.type || "Play-off")}</span>
                                <strong>${escapeHtml(playoff.teamAName)} vs ${escapeHtml(playoff.teamBName)}</strong>
                            </div>
                            <div class="playoff-leg-scores">
                                ${playoff.legs.map((leg, index) => {
                                    const home = getTeam(leg.homeId);
                                    const away = getTeam(leg.awayId);
                                    return `<span>Leg ${index + 1}: ${escapeHtml(home?.short || "?")} ${leg.homeGoals} — ${leg.awayGoals} ${escapeHtml(away?.short || "?")}</span>`;
                                }).join("")}
                                ${playoff.extraTime ? `<span>Perpanjangan waktu (${escapeHtml(playoff.teamAName)} — ${escapeHtml(playoff.teamBName)}): ${playoff.extraTime.teamAGoals} — ${playoff.extraTime.teamBGoals}</span>` : ""}
                                ${playoff.penalties ? `<span>Adu penalti (${escapeHtml(playoff.teamAName)} — ${escapeHtml(playoff.teamBName)}): ${playoff.penalties.teamAGoals}/${playoff.penalties.teamAAttempts} — ${playoff.penalties.teamBGoals}/${playoff.penalties.teamBAttempts}</span>` : ""}
                            </div>
                            <div class="playoff-result">
                                <strong>${playoff.extraTime ? "Skor akhir" : "Agregat"} ${finalTeamATotal} — ${finalTeamBTotal}</strong>
                                <span>Pemenang: ${escapeHtml(playoff.winnerName)}</span>
                            </div>
                        </article>`;
                    }).join("") : `<p class="notice">Belum ada riwayat play-off untuk kasta ini.</p>`}
                </div>
            </section>
            <section class="panel ai-match-reports" style="grid-column:1/-1">
                <div class="panel-header"><h2>Laporan Keputusan AI Klub</h2><span class="notice">5 pertandingan terakhir</span></div>
                <div class="panel-body">
                    ${aiMatches.length ? aiMatches.map(match => `
                        <article class="ai-match-report">
                            <strong>Pekan ${match.week} · ${escapeHtml(match.homeShort)} ${match.homeGoals} — ${match.awayGoals} ${escapeHtml(match.awayShort)}</strong>
                            ${renderAiDecisionReport(match, "home", getTeam(match.homeId)?.name || match.homeShort)}
                            ${renderAiDecisionReport(match, "away", getTeam(match.awayId)?.name || match.awayShort)}
                        </article>`).join("") : `<p class="notice">Laporan keputusan AI akan muncul setelah pertandingan dimainkan.</p>`}
                </div>
            </section>
            ${renderPlayerLeaderboard()}
        </div>`;
}

function renderSeasonArchive() {
    const archives = [...(state.seasonHistory || [])]
        .sort((a, b) => b.season.localeCompare(a.season));
    if (!archives.length) {
        return `
            <section class="panel archive-empty">
                <div class="panel-header"><h2>Arsip Musim</h2></div>
                <div class="panel-body">
                    <p class="notice">Belum ada musim yang diarsipkan. Arsip dibuat setelah rollover musim dikonfirmasi.</p>
                </div>
            </section>`;
    }

    const archive = archives.find(item => item.season === selectedArchiveSeason) || archives[0];
    selectedArchiveSeason = archive.season;
    const divisions = archive.divisions || [];
    const division = divisions.find(item => item.id === selectedArchiveDivisionId) || divisions[0];
    if (division) selectedArchiveDivisionId = division.id;
    const teams = divisions.flatMap(item => item.standings || []);
    const teamById = new Map(teams.map(team => [team.id, team]));
    const archivePlayers = archive.players || [];
    const playerTeams = [...new Map(archivePlayers.map(player => [
        player.teamId,
        { id: player.teamId, name: player.teamName }
    ])).values()].sort((a, b) => a.name.localeCompare(b.name));
    if (!playerTeams.some(team => team.id === selectedArchiveClubId)) {
        selectedArchiveClubId = playerTeams[0]?.id || null;
    }
    const clubPlayers = archivePlayers
        .filter(player => player.teamId === selectedArchiveClubId)
        .sort((a, b) => b.goals - a.goals || b.appearances - a.appearances || b.rating - a.rating);
    const divisionMatches = (archive.matches || [])
        .filter(match => match.divisionId === division?.id)
        .sort((a, b) => a.week - b.week || a.homeId - b.homeId);
    const pageSize = 25;
    const pageCount = Math.max(1, Math.ceil(divisionMatches.length / pageSize));
    archiveMatchPage = Math.max(1, Math.min(archiveMatchPage, pageCount));
    const pageMatches = divisionMatches.slice(
        (archiveMatchPage - 1) * pageSize,
        archiveMatchPage * pageSize
    );
    const movements = archive.movements || [];
    const playoffs = archive.playoffs || [];

    return `
        <div class="archive-page">
            <section class="panel archive-controls">
                <label>Musim
                    <select id="archiveSeasonSelect" class="secondary-button">
                        ${archives.map(item => `<option value="${escapeHtml(item.season)}" ${item.season === archive.season ? "selected" : ""}>${escapeHtml(item.season)}</option>`).join("")}
                    </select>
                </label>
                <label>Kasta
                    <select id="archiveDivisionSelect" class="secondary-button">
                        ${divisions.map(item => `<option value="${item.id}" ${item.id === division?.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
                    </select>
                </label>
            </section>
            <section class="panel archive-champion">
                <div class="archive-champion-mark">🏆</div>
                <div>
                    <p class="eyebrow">Juara Liga · Musim ${escapeHtml(archive.season)}</p>
                    <h2>${escapeHtml(archive.champion?.name || "Belum tersedia")}</h2>
                    <span class="notice">${escapeHtml(archive.champion?.short || "Arsip musim")}</span>
                </div>
                <div class="archive-champion-meta">
                    <span>${teams.length} klub</span>
                    <span>${(archive.matches || []).length} pertandingan</span>
                    <span>${archivePlayers.length} catatan pemain</span>
                </div>
            </section>
            <section class="panel">
                <div class="panel-header">
                    <h2>Klasemen Akhir · ${escapeHtml(division?.name || "Kasta")}</h2>
                    <span class="notice">${division?.standings?.length || 0} klub</span>
                </div>
                <div class="archive-table-scroll">
                    <table class="season-archive-table">
                        <thead><tr><th>#</th><th>Klub</th><th>M</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th><th>Rating</th></tr></thead>
                        <tbody>
                            ${(division?.standings || []).map(team => `
                                <tr class="${team.rank === 1 ? "archive-winner-row" : ""}">
                                    <td>${team.rank}</td>
                                    <td><strong>${escapeHtml(team.name)}</strong></td>
                                    <td>${team.p}</td><td>${team.w}</td><td>${team.d}</td><td>${team.l}</td>
                                    <td>${team.gf}</td><td>${team.ga}</td><td>${team.gd}</td><td><strong>${team.pts}</strong></td><td>${team.rating}</td>
                                </tr>`).join("")}
                        </tbody>
                    </table>
                </div>
            </section>
            <div class="archive-two-column">
                <section class="panel">
                    <div class="panel-header"><h2>Perpindahan Divisi</h2><span class="notice">${movements.length} klub</span></div>
                    <div class="panel-body">
                        ${movements.length ? movements.map(movement => {
                            const team = teamById.get(movement.teamId);
                            return `<div class="archive-list-row">
                                <span class="archive-movement-icon">${movement.to < movement.from ? "↑" : "↓"}</span>
                                <div><strong>${escapeHtml(team?.name || "Klub")}</strong><small>${escapeHtml(movement.type)} · Kasta ${movement.from} → ${movement.to}</small></div>
                            </div>`;
                        }).join("") : `<p class="notice">Tidak ada perpindahan pada musim ini.</p>`}
                    </div>
                </section>
                <section class="panel">
                    <div class="panel-header"><h2>Play-off</h2><span class="notice">${playoffs.length} hasil</span></div>
                    <div class="panel-body">
                        ${playoffs.length ? playoffs.map(playoff => `
                            <div class="archive-list-row">
                                <span class="archive-playoff-icon">⚽</span>
                                <div><strong>${escapeHtml(playoff.teamAName)} vs ${escapeHtml(playoff.teamBName)}</strong><small>${escapeHtml(playoff.type || "Play-off")} · Pemenang ${escapeHtml(playoff.winnerName)} · ${playoff.finalTeamATotal ?? playoff.teamATotal} — ${playoff.finalTeamBTotal ?? playoff.teamBTotal}</small></div>
                            </div>`).join("") : `<p class="notice">Tidak ada play-off pada musim ini.</p>`}
                    </div>
                </section>
            </div>
            <section class="panel">
                <div class="panel-header">
                    <h2>Statistik Pemain · ${escapeHtml(playerTeams.find(team => team.id === selectedArchiveClubId)?.name || "Klub")}</h2>
                    <select id="archivePlayerClubSelect" class="secondary-button">
                        ${playerTeams.map(team => `<option value="${team.id}" ${team.id === selectedArchiveClubId ? "selected" : ""}>${escapeHtml(team.name)}</option>`).join("")}
                    </select>
                </div>
                <div class="archive-table-scroll">
                    <table class="season-archive-table">
                        <thead><tr><th>Pemain</th><th>Pos</th><th>Usia</th><th>OVR</th><th>Potensi</th><th>Main</th><th>Gol</th><th>Assist</th><th>Clean Sheet</th><th>KK</th><th>KM</th></tr></thead>
                        <tbody>
                            ${clubPlayers.map(player => `
                                <tr>
                                    <td><strong>${escapeHtml(player.name)}</strong></td><td>${escapeHtml(player.role)}</td><td>${player.age}</td><td>${player.rating}</td><td>${player.potential}</td>
                                    <td>${player.appearances || 0}</td><td>${player.goals || 0}</td><td>${player.assists || 0}</td><td>${player.cleanSheets || 0}</td><td>${player.yellowCards || 0}</td><td>${player.redCards || 0}</td>
                                </tr>`).join("") || '<tr><td colspan="11" class="archive-empty-cell">Statistik pemain tidak tersedia.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </section>
            <section class="panel">
                <div class="panel-header">
                    <h2>Hasil & Statistik Pertandingan · ${escapeHtml(division?.name || "Kasta")}</h2>
                    <span class="notice">${divisionMatches.length} pertandingan</span>
                </div>
                <div class="panel-body archive-match-list">
                    ${pageMatches.length ? pageMatches.map(match => `
                        <article class="archive-match-row">
                            <span class="archive-match-week">Pekan ${match.week}</span>
                            <strong>${escapeHtml(match.homeShort)} vs ${escapeHtml(match.awayShort)}</strong>
                            <b>${match.homeGoals} — ${match.awayGoals}</b>
                            ${match.stats ? `<small>Penguasaan ${match.stats.possessionHome}% — ${match.stats.possessionAway}% · Tembakan ${match.stats.shotsHome} — ${match.stats.shotsAway} · xG ${match.stats.xgHome} — ${match.stats.xgAway}</small>` : '<small>Statistik pertandingan tidak tersedia.</small>'}
                            ${renderAiDecisionReport(match, "home", match.homeShort)}
                            ${renderAiDecisionReport(match, "away", match.awayShort)}
                        </article>`).join("") : `<p class="notice">Tidak ada hasil pertandingan yang tersimpan untuk kasta ini.</p>`}
                </div>
                ${pageCount > 1 ? `<div class="archive-pagination">
                    <button class="secondary-button" id="archiveMatchesPrevious" type="button" ${archiveMatchPage === 1 ? "disabled" : ""}>Sebelumnya</button>
                    <span>Halaman ${archiveMatchPage} / ${pageCount}</span>
                    <button class="secondary-button" id="archiveMatchesNext" type="button" ${archiveMatchPage === pageCount ? "disabled" : ""}>Berikutnya</button>
                </div>` : ""}
            </section>
        </div>`;
}

function showStartScreen() {
    document.getElementById("startScreen").hidden = false;
    document.getElementById("appShell").hidden = true;
    document.getElementById("startMenu").hidden = false;
    document.getElementById("setupPanel").hidden = true;
    document.getElementById("saveHint").textContent = state
        ? `${state.leagueName} · Musim ${state.season}`
        : saveLoadError
            ? "Save tidak dapat dibaca. Data tersimpan belum dihapus; coba Editor Liga atau mulai save baru."
            : "Belum ada save. Buat liga baru untuk mulai bermain.";
    document.querySelector('[data-start-action="continue"]').disabled = !state;
    const startEditor = document.querySelector('[data-start-action="editor"]');
    const editorLocked = state && !canEditLeague();
    startEditor.disabled = editorLocked;
    startEditor.title = editorLocked
        ? "Editor tim tersedia setelah perpindahan musim selesai"
        : "Edit nama liga dan daftar tim";
}

function launchGame() {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    document.getElementById("startScreen").hidden = true;
    document.getElementById("appShell").hidden = false;
    setView("overview");
}

function openSetup(mode, fromGame = false) {
    editorMode = mode;
    if (mode === "editor" && state && !canEditLeague()) {
        showToast("Editor tim tersedia setelah perpindahan musim selesai");
        showStartScreen();
        return;
    }
    editorLeagueName = mode === "editor" && state ? state.leagueName : "Liga Nusantara";
    editorDraft = mode === "editor" && state
        ? state.standings.map(team => ({ id: team.id, name: team.name }))
        : defaultTeamNames.map((name, index) => ({ id: index + 1, name }));
    const setupDivisions = mode === "editor" && state
        ? state.divisions
        : Array.from(
            { length: Math.ceil(editorDraft.length / MAX_TEAMS_PER_DIVISION) },
            (_, index) => ({ id: index + 1, name: `Kasta ${index + 1}` })
        );
    if (mode === "editor" && state) {
        state.rules.divisionMovements = normalizeDivisionMovements(setupDivisions);
    }
    const sourceMovements = mode === "editor"
        ? (state?.rules?.divisionMovements || [])
        : [];
    movementDraft = reconcileMovementDraft(
        setupDivisions,
        sourceMovements,
        getDraftDivisionSizes(editorDraft)
    );

    document.getElementById("startScreen").hidden = false;
    document.getElementById("appShell").hidden = true;
    document.getElementById("startMenu").hidden = true;
    document.getElementById("setupPanel").hidden = false;
    document.getElementById("setupPanel").dataset.fromGame = String(fromGame);
    renderSetup();
}

function renderSetup() {
    const isEditor = editorMode === "editor" && !!state;
    const editingLocked = isEditor && !canEditLeague();
    if (editingLocked) {
        showToast("Editor tim terkunci selama musim berlangsung");
        showStartScreen();
        return;
    }
    const leagueName = editorLeagueName;
    const setupDivisions = state && editorMode === "editor"
        ? state.divisions
        : Array.from(
            { length: Math.ceil(editorDraft.length / MAX_TEAMS_PER_DIVISION) },
            (_, index) => ({ id: index + 1, name: `Kasta ${index + 1}` })
        );
    movementDraft = movementDraft.length
        ? movementDraft
        : createDefaultDivisionMovements(setupDivisions, getDraftDivisionSizes(editorDraft));
    movementDraft = reconcileMovementDraft(
        setupDivisions,
        movementDraft,
        getDraftDivisionSizes(editorDraft)
    );
    const movementRows = movementDraft.map((movement, index) => `
        <article class="movement-rule-card">
            <div class="movement-rule-heading">
                <strong>Kasta ${movement.lowerDivisionId} → Kasta ${movement.upperDivisionId}</strong>
                <span>Batas kasta ${movement.upperDivisionId}/${movement.lowerDivisionId}</span>
            </div>
            <label>Metode promosi
                <select class="secondary-button movement-mode" data-movement-index="${index}">
                    <option value="auto" ${movement.mode === "auto" ? "selected" : ""}>Otomatis langsung</option>
                    <option value="internal_playoff" ${movement.mode === "internal_playoff" ? "selected" : ""}>Play-off internal</option>
                    <option value="cross_playoff" ${movement.mode === "cross_playoff" ? "selected" : ""}>Play-off lintas kasta</option>
                </select>
            </label>
            <div class="movement-fields">
                <label>Auto promosi
                    <input type="number" min="0" max="${MAX_TEAMS_PER_DIVISION}" class="movement-promoted" data-movement-index="${index}" value="${movement.promotedCount}">
                </label>
                <label>${movement.mode === "internal_playoff" ? "Total degradasi" : "Auto degradasi"}
                    <input type="number" min="0" max="${MAX_TEAMS_PER_DIVISION}" class="movement-relegated" data-movement-index="${index}" value="${movement.relegatedCount}">
                </label>
                ${movement.mode === "internal_playoff" ? `
                    <label>Tim ikut play-off
                        <input type="number" min="2" max="${MAX_TEAMS_PER_DIVISION}" class="movement-playoff" data-movement-index="${index}" value="${Math.max(2, movement.playoffSpots)}">
                    </label>` : ""}
                ${movement.mode === "cross_playoff" ? `
                    <label>Posisi lintas kasta
                        <input type="number" min="1" max="${MAX_TEAMS_PER_DIVISION}" class="movement-cross" data-movement-index="${index}" value="${movement.crossPlayoffPosition}">
                    </label>` : ""}
            </div>
            <small class="movement-rule-help">
                ${movement.mode === "internal_playoff"
                    ? "Pemenang play-off mendapat satu slot promosi tambahan; total degradasi harus sama dengan promosi otomatis + 1."
                    : movement.mode === "cross_playoff"
                        ? "Promosi/degradasi otomatis harus seimbang. Posisi play-off tidak boleh bentrok dengan slot otomatis."
                        : "Jumlah promosi otomatis harus sama dengan jumlah degradasi otomatis."}
            </small>
        </article>`).join("");
    const teamRows = editorDraft.map((team, index) => `
        <div class="team-edit-row">
            <span class="team-edit-index">${String(index + 1).padStart(2, "0")}</span>
            <input class="team-name-input" type="text" maxlength="40" required
                aria-label="Nama tim ${index + 1}" data-team-index="${index}"
                value="${escapeHtml(team.name)}" placeholder="Masukkan nama tim">
            <button type="button" class="remove-team-button" data-remove-team="${index}"
                aria-label="Hapus tim ${index + 1}" ${editorDraft.length <= MIN_TEAMS ? "disabled" : ""}>×</button>
        </div>`).join("");

    document.getElementById("setupPanel").innerHTML = `
        <div class="setup-heading">
            <button class="back-button" id="setupBack" type="button">← Kembali</button>
            <p class="eyebrow">${isEditor ? "Pengaturan Kompetisi" : "Game Baru"}</p>
            <h2>${isEditor ? "Editor Liga" : "Buat Liga Baru"}</h2>
            <p class="notice">Minimal ${MIN_TEAMS} tim. Setiap ${MAX_TEAMS_PER_DIVISION} tim dibagi menjadi satu kasta/divisi.</p>
        </div>
        <form id="leagueSetupForm" class="setup-form">
            <label for="leagueNameInput">Nama liga</label>
            <input id="leagueNameInput" type="text" maxlength="50" required value="${escapeHtml(leagueName)}" placeholder="Contoh: Liga Nusantara">
            <div class="promotion-settings">
                <section class="movement-rules">
                    <div class="team-list-heading">
                        <div><label>Aturan promosi & degradasi</label><small>Dapat diatur berbeda untuk setiap batas kasta</small></div>
                    </div>
                    ${movementRows || '<p class="notice">Liga satu kasta tidak memiliki batas promosi/degradasi.</p>'}
                </section>
            </div>
            <div class="team-list-heading">
                <div><label>Tim peserta</label><small id="teamCount">${editorDraft.length} tim · ${Math.ceil(editorDraft.length / MAX_TEAMS_PER_DIVISION)} kasta</small></div>
                <button class="secondary-button" id="addTeamButton" type="button">＋ Tambah tim</button>
            </div>
            <div id="teamEditorList" class="team-editor-list">${teamRows}</div>
            <p id="setupError" class="setup-error" role="alert"></p>
            <button class="primary-button setup-submit" type="submit">${isEditor ? "Simpan Perubahan" : "Buat Liga & Mulai"}</button>
        </form>`;

    document.getElementById("setupBack").addEventListener("click", () => {
        const fromGame = document.getElementById("setupPanel").dataset.fromGame === "true";
        if (fromGame) launchGame();
        else showStartScreen();
    });

    document.getElementById("addTeamButton").addEventListener("click", () => {
        syncEditorDraft();
        syncEditorLeagueName();
        syncMovementDraft();
        const nextId = editorDraft.reduce((max, team) => Math.max(max, team.id || 0), 0) + 1;
        editorDraft.push({ id: nextId, name: `Klub Baru ${editorDraft.length + 1}` });
        renderSetup();
    });

    document.querySelectorAll("[data-remove-team]").forEach(button => {
        button.addEventListener("click", () => {
            syncEditorDraft();
            syncEditorLeagueName();
            syncMovementDraft();
            if (editorDraft.length <= MIN_TEAMS) return;
            editorDraft.splice(Number(button.dataset.removeTeam), 1);
            renderSetup();
        });

        document.querySelectorAll(".movement-mode").forEach(select => {
            select.addEventListener("change", () => {
                const index = Number(select.dataset.movementIndex);
                if (movementDraft[index]) movementDraft[index].mode = select.value;
                renderSetup();
            });
        });
    });

    document.getElementById("leagueSetupForm").addEventListener("submit", saveLeagueSetup);
}

function syncEditorDraft() {
    document.querySelectorAll(".team-name-input").forEach(input => {
        const team = editorDraft[Number(input.dataset.teamIndex)];
        if (team) team.name = input.value;
    });
}

function syncEditorLeagueName() {
    const input = document.getElementById("leagueNameInput");
    if (input) editorLeagueName = input.value;
}

function syncMovementDraft() {
    document.querySelectorAll(".movement-mode").forEach(select => {
        const index = Number(select.dataset.movementIndex);
        if (movementDraft[index]) movementDraft[index].mode = select.value;
    });
    document.querySelectorAll(".movement-promoted").forEach(input => {
        const index = Number(input.dataset.movementIndex);
        if (movementDraft[index]) movementDraft[index].promotedCount = Number(input.value);
    });
    document.querySelectorAll(".movement-relegated").forEach(input => {
        const index = Number(input.dataset.movementIndex);
        if (movementDraft[index]) movementDraft[index].relegatedCount = Number(input.value);
    });
    document.querySelectorAll(".movement-playoff").forEach(input => {
        const index = Number(input.dataset.movementIndex);
        if (movementDraft[index]) movementDraft[index].playoffSpots = Number(input.value);
    });
    document.querySelectorAll(".movement-cross").forEach(input => {
        const index = Number(input.dataset.movementIndex);
        if (movementDraft[index]) movementDraft[index].crossPlayoffPosition = Number(input.value);
    });
}

function saveLeagueSetup(event) {
    event.preventDefault();
    syncEditorDraft();
    syncEditorLeagueName();
    const error = document.getElementById("setupError");
    const leagueName = document.getElementById("leagueNameInput").value.trim();
    const names = editorDraft.map(team => team.name.trim());
    syncMovementDraft();

    if (!leagueName) {
        error.textContent = "Nama liga wajib diisi.";
        return;
    }
    if (names.length < MIN_TEAMS) {
        error.textContent = `Liga minimal memiliki ${MIN_TEAMS} tim.`;
        return;
    }
    if (names.some(name => !name)) {
        error.textContent = "Nama setiap tim wajib diisi.";
        return;
    }
    if (new Set(names.map(name => name.toLocaleLowerCase())).size !== names.length) {
        error.textContent = "Setiap tim harus memiliki nama yang berbeda.";
        return;
    }
    if (movementDraft.some(movement =>
        !Number.isInteger(movement.promotedCount) || movement.promotedCount < 0 ||
        !Number.isInteger(movement.relegatedCount) || movement.relegatedCount < 0 ||
        !Number.isInteger(movement.playoffSpots) || movement.playoffSpots < 0 ||
        !Number.isInteger(movement.crossPlayoffPosition) || movement.crossPlayoffPosition < 1 ||
        !["auto", "internal_playoff", "cross_playoff"].includes(movement.mode))) {
        error.textContent = "Jumlah promosi, degradasi, dan posisi playoff harus valid.";
        return;
    }
    const divisionSizes = {};
    names.forEach((_, index) => {
        const divisionId = Math.floor(index / MAX_TEAMS_PER_DIVISION) + 1;
        divisionSizes[divisionId] = (divisionSizes[divisionId] || 0) + 1;
    });
    const movementError = validateDivisionMovementRules(movementDraft, divisionSizes);
    if (movementError) {
        error.textContent = movementError;
        return;
    }

    const creatingGame = editorMode === "new" || !state;
    if (creatingGame) {
        if (state && !confirm("Game baru akan mengganti save liga yang sedang tersimpan. Lanjutkan?")) return;
        state = createInitialState(leagueName, names);
    } else {
        const ids = editorDraft.map(team => team.id);
        const oldIds = state.standings.map(team => team.id);
        const rosterChanged = ids.length !== oldIds.length || ids.some(id => !oldIds.includes(id));
        if (rosterChanged && state.matchLog.length > 0 &&
            !confirm("Perubahan jumlah atau susunan tim akan mengatur ulang hasil dan jadwal musim. Lanjutkan?")) return;
        applyLeagueEdits(leagueName, editorDraft);
    }

    state.rules.divisionMovements = movementDraft.map(movement => ({
        upperDivisionId: movement.upperDivisionId,
        lowerDivisionId: movement.lowerDivisionId,
        mode: movement.mode,
        promotedCount: Math.min(movement.promotedCount, MAX_TEAMS_PER_DIVISION),
        relegatedCount: Math.min(movement.relegatedCount, MAX_TEAMS_PER_DIVISION),
        playoffSpots: Math.min(movement.playoffSpots, MAX_TEAMS_PER_DIVISION),
        crossPlayoffPosition: Math.min(movement.crossPlayoffPosition, MAX_TEAMS_PER_DIVISION)
    }));

    saveState(false);
    launchGame();
    showToast(creatingGame ? "Liga baru berhasil dibuat" : "Perubahan liga berhasil disimpan");
}

function applyLeagueEdits(leagueName, draft) {
    const previousTeams = state.standings;
    const previousIds = previousTeams.map(team => team.id);
    const nextIds = draft.map(team => team.id);
    const rosterChanged = nextIds.length !== previousIds.length || nextIds.some(id => !previousIds.includes(id));

    if (!rosterChanged) {
        state.matchLog.forEach(match => {
            if (!match.homeId) match.homeId = previousTeams.find(team => team.short === match.homeShort)?.id;
            if (!match.awayId) match.awayId = previousTeams.find(team => team.short === match.awayShort)?.id;
        });
    }

    state.leagueName = leagueName.trim();
    const shortNames = getUniqueShortNames(draft.map(team => team.name));
    state.divisions = Array.from(
        { length: Math.ceil(draft.length / MAX_TEAMS_PER_DIVISION) },
        (_, index) => ({ id: index + 1, name: `Kasta ${index + 1}` })
    );
    state.standings = draft.map((draftTeam, index) => {
        const existing = previousTeams.find(team => team.id === draftTeam.id);
        const name = draftTeam.name.trim();
        const short = shortNames[index];
        const divisionId = Math.floor(index / MAX_TEAMS_PER_DIVISION) + 1;
        if (existing && !rosterChanged) return { ...existing, name, short, divisionId };
        return {
            id: draftTeam.id,
            name,
            short,
            divisionId,
            city: existing?.city || "Kota",
            rating: existing?.rating || (68 + ((index * 7) % 12)),
            attackRating: existing?.attackRating || (68 + ((index * 5) % 11)),
            defenseRating: existing?.defenseRating || (68 + ((index * 9) % 11)),
            midfieldRating: existing?.midfieldRating || (68 + ((index * 7) % 11)),
            fitness: existing?.fitness || 92,
            momentum: existing?.momentum || 50,
            squad: existing?.squad || createTeamSquad(name, existing?.rating || (68 + ((index * 7) % 12)), index),
            nextPlayerSequence: existing?.nextPlayerSequence || ((existing?.squad?.length || 11) + 1),
            budget: existing?.budget || (1800 + ((index * 350) % 2000)),
            fans: existing?.fans || (55 + ((index * 9) % 40)),
            p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0
        };
    });

    if (rosterChanged) {
        state.divisionProgress = {};
        state.divisions.forEach(division => {
            state.divisionProgress[division.id] = 1;
        });
        initializePreviousDivisionRanks(state.standings, true);
        state.week = 1;
        state.matchLog = [];
        state.fixtures = state.divisions.flatMap(division => {
            const teamIds = state.standings
                .filter(team => team.divisionId === division.id)
                .map(team => team.id);
            return createFixtures(teamIds, division.id, state.season);
        });
    } else {
        state.matchLog.forEach(match => {
            const home = state.standings.find(team => team.id === match.homeId);
            const away = state.standings.find(team => team.id === match.awayId);
            if (home) match.homeShort = home.short;
            if (away) match.awayShort = away.short;
        });
    }
}

function bindViewEvents() {
    document.querySelectorAll("[data-go]").forEach(button =>
        button.addEventListener("click", () => setView(button.dataset.go)));
    document.querySelectorAll("[data-club-id]").forEach(button =>
        button.addEventListener("click", () => openClubDetail(button.dataset.clubId)));
    const clubDetailBack = document.getElementById("clubDetailBack");
    if (clubDetailBack) clubDetailBack.addEventListener("click", returnFromClubDetail);
    const leaderboardCategorySelect = document.getElementById("playerLeaderboardCategory");
    if (leaderboardCategorySelect) leaderboardCategorySelect.addEventListener("change", () => {
        playerLeaderboardCategory = leaderboardCategorySelect.value;
        playerLeaderboardPage = 1;
        setView("records");
    });
    const leaderboardDivisionSelect = document.getElementById("playerLeaderboardDivision");
    if (leaderboardDivisionSelect) leaderboardDivisionSelect.addEventListener("change", () => {
        playerLeaderboardDivisionId = leaderboardDivisionSelect.value;
        playerLeaderboardPage = 1;
        setView("records");
    });
    const leaderboardPrevious = document.getElementById("playerLeaderboardPrevious");
    if (leaderboardPrevious) leaderboardPrevious.addEventListener("click", () => {
        playerLeaderboardPage = Math.max(1, playerLeaderboardPage - 1);
        setView("records");
    });
    const leaderboardNext = document.getElementById("playerLeaderboardNext");
    if (leaderboardNext) leaderboardNext.addEventListener("click", () => {
        playerLeaderboardPage += 1;
        setView("records");
    });
    const archiveSeasonSelect = document.getElementById("archiveSeasonSelect");
    if (archiveSeasonSelect) archiveSeasonSelect.addEventListener("change", () => {
        selectedArchiveSeason = archiveSeasonSelect.value;
        selectedArchiveDivisionId = 1;
        selectedArchiveClubId = null;
        archiveMatchPage = 1;
        setView("archive");
    });
    const archiveDivisionSelect = document.getElementById("archiveDivisionSelect");
    if (archiveDivisionSelect) archiveDivisionSelect.addEventListener("change", () => {
        selectedArchiveDivisionId = Number(archiveDivisionSelect.value);
        archiveMatchPage = 1;
        setView("archive");
    });
    const archivePlayerClubSelect = document.getElementById("archivePlayerClubSelect");
    if (archivePlayerClubSelect) archivePlayerClubSelect.addEventListener("change", () => {
        selectedArchiveClubId = Number(archivePlayerClubSelect.value);
        setView("archive");
    });
    const archiveMatchesPrevious = document.getElementById("archiveMatchesPrevious");
    if (archiveMatchesPrevious) archiveMatchesPrevious.addEventListener("click", () => {
        archiveMatchPage = Math.max(1, archiveMatchPage - 1);
        setView("archive");
    });
    const archiveMatchesNext = document.getElementById("archiveMatchesNext");
    if (archiveMatchesNext) archiveMatchesNext.addEventListener("click", () => {
        archiveMatchPage += 1;
        setView("archive");
    });
    document.querySelectorAll("[data-division]").forEach(button =>
        button.addEventListener("click", () => {
            activeDivisionId = Number(button.dataset.division);
            setView(activeView);
        }));

    const simulateButton = document.getElementById("simulateWeek");
    if (simulateButton) simulateButton.addEventListener("click", simulateWeek);

    const processSeasonEndButton = document.getElementById("processSeasonEnd");
    if (processSeasonEndButton) processSeasonEndButton.addEventListener("click", processSeasonEnd);

    const startNextSeasonButton = document.getElementById("startNextSeason");
    if (startNextSeasonButton) startNextSeasonButton.addEventListener("click", startNextSeason);

    const saveRulesButton = document.getElementById("saveRules");
    if (saveRulesButton) saveRulesButton.addEventListener("click", () => {
        state.rules.pointsWin = Number(document.getElementById("pointsWin").value);
        state.rules.pointsDraw = Number(document.getElementById("pointsDraw").value);
        state.rules.foreignPlayers = Number(document.getElementById("foreignPlayers").value);
        state.rules.homeAdvantage = document.getElementById("homeAdvantage").value;
        state.rules.transferWindow = document.getElementById("transferWindow").value;
        state.rules.discipline = document.getElementById("discipline").value;
        state.reputation = Math.max(40, Math.min(100,
            state.reputation + (state.rules.discipline === "Ketat" ? 2 : 0)));
        saveState(false);
        showToast("Peraturan federasi diterapkan");
        render();
    });
}

function poisson(lambda) {
    if (lambda <= 0) return 0;
    const limit = Math.exp(-lambda);
    let product = 1;
    let count = 0;
    do {
        count += 1;
        product *= Math.random();
    } while (product > limit && count < 10);
    return count - 1;
}

function getTeamFormScore(team) {
    const recent = state.matchLog
        .filter(match => match.homeId === team.id || match.awayId === team.id)
        .slice(-5);
    let score = 0;
    recent.forEach(match => {
        const isHome = match.homeId === team.id;
        const scored = isHome ? match.homeGoals : match.awayGoals;
        const conceded = isHome ? match.awayGoals : match.homeGoals;
        score += scored > conceded ? 1.2 : scored === conceded ? 0.2 : -1;
    });
    return score;
}

function calculateTeamRatings(team) {
    if (!team.squad?.length) {
        team.squad = createTeamSquad(team.name, team.rating, team.id - 1);
    }
    const attacks = team.squad.filter(player => ["ST", "RW", "LW", "AM"].includes(player.role));
    const midfielders = team.squad.filter(player => ["CM", "AM"].includes(player.role));
    const defenders = team.squad.filter(player => ["CB", "RB", "LB"].includes(player.role));
    const average = players => players.length
        ? players.reduce((sum, player) => sum + player.rating, 0) / players.length
        : team.rating;
    team.attackRating = Math.round(average(attacks) * 0.75 + team.rating * 0.25);
    team.midfieldRating = Math.round(average(midfielders) * 0.75 + team.rating * 0.25);
    team.defenseRating = Math.round(average(defenders) * 0.75 + team.rating * 0.25);
    team.fitness = Math.max(70, Math.min(100, Math.round(team.squad.reduce((sum, player) => sum + player.fitness, 0) / team.squad.length)));
    return team;
}

function createMatchEvent(home, away, minute, type, player, detail) {
    return {
        minute,
        type,
        teamId: player?.teamId || (type === "goal" ? home.id : away.id),
        playerId: player?.id || null,
        playerName: player?.name || "",
        detail: detail || ""
    };
}

function updatePlayerMatchStatistics(home, away, homeLineup, awayLineup, homeGoals, awayGoals, events) {
    events.forEach(event => {
        const team = event.teamId === home.id
            ? home
            : event.teamId === away.id
                ? away
                : null;
        if (!team) return;
        const player = team.squad.find(item => item.id === event.playerId) ||
            team.squad.find(item => item.name === event.playerName);
        if (!player) return;
        if (event.type === "goal") player.goals = (player.goals || 0) + 1;
        if (event.type === "assist") player.assists = (player.assists || 0) + 1;
        if (event.type === "yellow") player.yellowCards = (player.yellowCards || 0) + 1;
        if (event.type === "red") player.redCards = (player.redCards || 0) + 1;
    });

    [home, away].forEach(team => {
        team.momentum = Math.max(0, Math.min(100,
            (team.momentum || 50) + (team.id === home.id
                ? homeGoals > awayGoals ? 4 : homeGoals === awayGoals ? 1 : -3
                : awayGoals > homeGoals ? 4 : awayGoals === homeGoals ? 1 : -3)));
        const startingPlayers = new Set(team.id === home.id ? homeLineup : awayLineup);
        const goalsConceded = team.id === home.id ? awayGoals : homeGoals;
        team.squad.forEach(player => {
            if (startingPlayers.has(player)) {
                player.appearances = (player.appearances || 0) + 1;
                if (goalsConceded === 0 && ["GK", "CB", "RB", "LB"].includes(player.role)) {
                    player.cleanSheets = (player.cleanSheets || 0) + 1;
                }
                player.fitness = Math.max(70, player.fitness - STARTING_FITNESS_COST);
            } else {
                player.fitness = Math.min(100, player.fitness + BENCH_FITNESS_RECOVERY);
            }
        });
        calculateTeamRatings(team);
    });
}

function getPlayerPositionGroup(role) {
    if (role === "GK") return "GK";
    if (["CB", "RB", "LB"].includes(role)) return "DEF";
    if (["CM", "AM"].includes(role)) return "MID";
    if (["ST", "RW", "LW"].includes(role)) return "FWD";
    return null;
}

function getPlayerSelectionScore(player) {
    return (Number(player.rating) || 0) +
        ((Math.max(70, Math.min(100, Number(player.fitness) || 92)) - 85) *
            PLAYER_FITNESS_ROTATION_WEIGHT);
}

function compareLineupCandidates(a, b) {
    return b.score - a.score ||
        (Number(b.player.rating) || 0) - (Number(a.player.rating) || 0) ||
        (Number(b.player.fitness) || 92) - (Number(a.player.fitness) || 92) ||
        (Number(a.player.appearances) || 0) - (Number(b.player.appearances) || 0);
}

function selectLineupDecision(team) {
    calculateTeamRatings(team);
    const candidates = team.squad.map(player => ({
        player,
        group: getPlayerPositionGroup(player.role),
        score: getPlayerSelectionScore(player)
    }));
    const slots = [
        { group: "GK", count: 1 },
        { group: "DEF", count: 4 },
        { group: "MID", count: 3 },
        { group: "FWD", count: 3 }
    ];
    const selected = [];
    const selectedPlayers = new Set();

    slots.forEach(({ group, count }) => {
        const groupCandidates = candidates
            .filter(candidate => candidate.group === group)
            .sort(compareLineupCandidates);
        groupCandidates.slice(0, count).forEach(candidate => {
            selected.push(candidate);
            selectedPlayers.add(candidate.player);
        });
    });

    if (selected.length < 11) {
        candidates
            .filter(candidate => !selectedPlayers.has(candidate.player))
            .sort(compareLineupCandidates)
            .slice(0, 11 - selected.length)
            .forEach(candidate => {
                selected.push(candidate);
                selectedPlayers.add(candidate.player);
            });
    }

    const starters = selected.map(candidate => {
        const higherRatedAlternative = candidates
            .filter(other =>
                other.group === candidate.group &&
                other.player !== candidate.player &&
                (Number(other.player.rating) || 0) > (Number(candidate.player.rating) || 0) &&
                (Number(other.player.fitness) || 92) < (Number(candidate.player.fitness) || 92) &&
                other.score <= candidate.score
            )
            .sort((a, b) => (Number(b.player.rating) || 0) - (Number(a.player.rating) || 0))[0];
        return {
            id: candidate.player.id,
            name: candidate.player.name,
            role: candidate.player.role,
            rating: candidate.player.rating,
            fitness: candidate.player.fitness,
            reason: higherRatedAlternative ? "fitness-rotation" : "best-available",
            comparison: higherRatedAlternative ? {
                name: higherRatedAlternative.player.name,
                rating: higherRatedAlternative.player.rating,
                fitness: higherRatedAlternative.player.fitness
            } : null
        };
    });
    const restedCandidates = candidates
        .filter(candidate => !selectedPlayers.has(candidate.player))
        .sort((a, b) =>
            (Number(a.player.fitness) || 92) - (Number(b.player.fitness) || 92) ||
            compareLineupCandidates(a, b)
        );
    const rested = restedCandidates.slice(0, 3).map(candidate => ({
        id: candidate.player.id,
        name: candidate.player.name,
        role: candidate.player.role,
        rating: candidate.player.rating,
        fitness: candidate.player.fitness,
        reason: candidate.player.fitness <= 80 ? "recovery" : "depth"
    }));

    return {
        players: selected.map(candidate => candidate.player),
        starters,
        report: {
            formation: "4-3-3",
            rotationCount: starters.filter(player => player.reason === "fitness-rotation").length,
            restedCount: restedCandidates.length,
            lowFitnessRestedCount: restedCandidates.filter(candidate =>
                candidate.player.fitness <= 80).length,
            rested
        }
    };
}

function selectStartingLineup(team) {
    return selectLineupDecision(team).players;
}

function getLineupRatings(team, lineup) {
    const attacks = lineup.filter(player => ["ST", "RW", "LW", "AM"].includes(player.role));
    const midfielders = lineup.filter(player => ["CM", "AM"].includes(player.role));
    const defenders = lineup.filter(player => ["CB", "RB", "LB"].includes(player.role));
    const average = players => players.length
        ? players.reduce((sum, player) => sum + player.rating, 0) / players.length
        : team.rating;
    return {
        attackRating: Math.round(average(attacks) * 0.75 + team.rating * 0.25),
        midfieldRating: Math.round(average(midfielders) * 0.75 + team.rating * 0.25),
        defenseRating: Math.round(average(defenders) * 0.75 + team.rating * 0.25),
        fitness: lineup.length
            ? lineup.reduce((sum, player) => sum + player.fitness, 0) / lineup.length
            : team.fitness
    };
}

function simulateDetailedMatch(home, away, isHome, week) {
    const homeSelection = selectLineupDecision(home);
    const awaySelection = selectLineupDecision(away);
    const homeLineup = homeSelection.players;
    const awayLineup = awaySelection.players;
    const homeLineupRatings = getLineupRatings(home, homeLineup);
    const awayLineupRatings = getLineupRatings(away, awayLineup);
    const homeForm = getTeamFormScore(home);
    const awayForm = getTeamFormScore(away);
    const homeBoost = state.rules.homeAdvantage === "Tinggi" ? 0.28 : state.rules.homeAdvantage === "Rendah" ? 0.08 : 0.16;
    const homeStrength = homeLineupRatings.attackRating - awayLineupRatings.defenseRating +
        homeBoost * 10 + homeForm * 0.25 + (homeLineupRatings.fitness - 88) * 0.08;
    const awayStrength = awayLineupRatings.attackRating - homeLineupRatings.defenseRating +
        awayForm * 0.25 + (awayLineupRatings.fitness - 88) * 0.08;
    const homeExpected = Math.max(0.2, 1.35 + homeStrength / 22);
    const awayExpected = Math.max(0.2, 1.05 + awayStrength / 24);
    const homeGoals = poisson(homeExpected);
    const awayGoals = poisson(awayExpected);

    const events = [];
    const teamLineups = [
        ...homeLineup.map(player => ({ ...player, teamId: home.id, teamName: home.name })),
        ...awayLineup.map(player => ({ ...player, teamId: away.id, teamName: away.name }))
    ];

    [
        { team: home, opponent: away, goals: homeGoals },
        { team: away, opponent: home, goals: awayGoals }
    ].forEach(({ team, opponent, goals }) => {
        const attackers = teamLineups.filter(player =>
            player.teamId === team.id && ["ST", "RW", "LW", "AM"].includes(player.role));
        for (let goalIndex = 0; goalIndex < goals; goalIndex++) {
            const scorer = attackers[Math.floor(Math.random() * attackers.length)] ||
                teamLineups.find(player => player.teamId === team.id);
            const minute = 4 + Math.floor(Math.random() * 84);
            events.push(createMatchEvent(team, opponent, minute, "goal", scorer, "Gol"));

            const availableAssisters = attackers.filter(player => player.id !== scorer?.id);
            const assister = availableAssisters[Math.floor(Math.random() * availableAssisters.length)];
            if (assister) {
                events.push(createMatchEvent(team, opponent, minute, "assist", assister, "Assist"));
            }
        }
    });

    teamLineups.forEach(player => {
        if (Math.random() < 0.12) {
            const minute = 15 + Math.floor(Math.random() * 70);
            events.push(createMatchEvent(home, away, minute, "yellow", player, "Kartu kuning"));
        } else if (Math.random() < 0.012) {
            const minute = 25 + Math.floor(Math.random() * 60);
            events.push(createMatchEvent(home, away, minute, "red", player, "Kartu merah"));
        }
    });

    events.sort((a, b) => a.minute - b.minute);
    updatePlayerMatchStatistics(home, away, homeLineup, awayLineup, homeGoals, awayGoals, events);

    const stats = {
        possessionHome: Math.round(50 + (homeLineupRatings.midfieldRating - awayLineupRatings.midfieldRating) * 0.8 + (Math.random() * 8 - 4)),
        shotsHome: Math.max(3, poisson(homeExpected * 4.2)),
        shotsAway: Math.max(3, poisson(awayExpected * 4.2)),
        xgHome: Number(homeExpected.toFixed(2)),
        xgAway: Number(awayExpected.toFixed(2))
    };
    stats.possessionAway = 100 - stats.possessionHome;

    return {
        homeGoals,
        awayGoals,
        events,
        lineup: { home: homeSelection.starters, away: awaySelection.starters },
        aiDecision: { home: homeSelection.report, away: awaySelection.report },
        stats
    };
}

function simulateWeek() {
    if (!state.divisionProgress) state.divisionProgress = {};
    const divisionWeek = state.divisionProgress[activeDivisionId] || 1;
    const divisionFixtures = state.fixtures
        .filter(match => match.divisionId === activeDivisionId);
    const totalWeeks = Math.max(1, ...divisionFixtures.map(match => match.week));
    if (divisionWeek > totalWeeks) {
        showToast("Musim telah selesai");
        return;
    }

    const weekFixtures = divisionFixtures.filter(match => match.week === divisionWeek);
    state.standings
        .filter(team => team.divisionId === activeDivisionId)
        .sort(compareTableStandings)
        .forEach((team, index) => {
            team.previousDivisionRank = index + 1;
        });
    updateGlobalRanking();
    state.standings.forEach(team => {
        team.previousGlobalRank = team.globalRank || 1;
    });
    weekFixtures.forEach(match => {
        const home = getTeam(match.homeId);
        const away = getTeam(match.awayId);
        const result = simulateDetailedMatch(home, away, true, divisionWeek);
        const homeGoals = result.homeGoals;
        const awayGoals = result.awayGoals;

        match.played = true;
        match.homeGoals = homeGoals;
        match.awayGoals = awayGoals;
        updateStandings(home, homeGoals, awayGoals);
        updateStandings(away, awayGoals, homeGoals);
        calculateRankingChange(home, away, homeGoals, awayGoals);
        calculateRankingChange(away, home, awayGoals, homeGoals);
        state.matchLog.push({
            week: divisionWeek,
            divisionId: match.divisionId,
            homeId: home.id,
            awayId: away.id,
            homeShort: home.short,
            awayShort: away.short,
            homeGoals,
            awayGoals,
            events: result.events,
            lineup: result.lineup,
            aiDecision: result.aiDecision,
            stats: result.stats
        });
    });

    state.federationBudget += 380;
    updateGlobalRanking();
    state.divisionProgress[activeDivisionId] = divisionWeek + 1;
    state.week = Math.max(...Object.values(state.divisionProgress));
    saveState(false);
    showToast(`${weekFixtures.length} pertandingan pekan ${divisionWeek} selesai`);
    setView("overview");
}

function startNextSeason() {
    if (!isSeasonComplete()) {
        showToast("Selesaikan seluruh kasta sebelum memulai musim baru");
        return;
    }
    if (!state.pendingSeasonTransition) {
        showToast("Tentukan pergerakan dan simulasikan play-off terlebih dahulu");
        return;
    }
    const movementError = validateMovementPlan(
        state.pendingSeasonTransition.movements,
        state.divisions,
        state.standings
    );
    if (movementError) {
        showToast(movementError);
        return;
    }
    if (!confirm(`Lanjutkan ke musim ${getNextSeason(state.season)} dengan hasil promosi dan play-off yang sudah ditampilkan? Klasemen dan jadwal akan diatur ulang.`)) return;

    const seasonArchive = archiveCurrentSeason();
    state.pendingSeasonTransition.movements.forEach(movement => {
        const team = getTeam(movement.teamId);
        if (team) team.divisionId = movement.to;
    });

    state.lastPlayerLifecycle = processPlayerSeasonLifecycle();
    seasonArchive.playerLifecycle = state.lastPlayerLifecycle;
    state.lastPlayerLifecycle.retirements.forEach(retirement => {
        state.playerRetirementHistory.push(retirement);
    });
    state.standings.forEach(team => {
        team.squad.forEach(player => {
            player.goals = 0;
            player.assists = 0;
            player.appearances = 0;
            player.cleanSheets = 0;
            player.yellowCards = 0;
            player.redCards = 0;
        });
    });
    state.season = getNextSeason(state.season);

    const standings = state.standings.map(team => ({
        ...team,
        p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0,
        rankingChange: 0,
        previousGlobalRank: team.globalRank || team.previousGlobalRank || 1,
        globalRank: team.globalRank || team.previousGlobalRank || 1
    }));
    state.standings = standings;
    initializePreviousDivisionRanks(state.standings, true);
    state.matchLog = [];
    state.pendingSeasonTransition = null;
    state.week = 1;
    state.divisionProgress = {};
    state.divisions.forEach(division => {
        state.divisionProgress[division.id] = 1;
    });
    state.fixtures = state.divisions.flatMap(division => {
        const teamIds = state.standings
            .filter(team => team.divisionId === division.id)
            .map(team => team.id);
        return createFixtures(teamIds, division.id, state.season);
    });
    activeDivisionId = 1;
    saveState(false);
    showToast("Musim baru dimulai");
    setView("overview");
}

function archiveCurrentSeason() {
    if (!Array.isArray(state.seasonHistory)) state.seasonHistory = [];
    const existing = state.seasonHistory.find(archive => archive.season === state.season);
    if (existing) return existing;

    const divisions = state.divisions.map(division => {
        const table = state.standings
            .filter(team => team.divisionId === division.id)
            .sort(compareTableStandings)
            .map((team, index) => ({
                rank: index + 1,
                id: team.id,
                name: team.name,
                short: team.short,
                rating: team.rating,
                rankingPoints: team.rankingPoints,
                fitness: team.fitness,
                budget: team.budget,
                fans: team.fans,
                p: team.p,
                w: team.w,
                d: team.d,
                l: team.l,
                gf: team.gf,
                ga: team.ga,
                gd: team.gf - team.ga,
                pts: team.pts
            }));
        const winner = table[0];
        return {
            id: division.id,
            name: division.name,
            champion: winner ? { id: winner.id, name: winner.name, short: winner.short } : null,
            standings: table
        };
    });
    const movements = state.pendingSeasonTransition?.movements || state.lastMovements || [];
    const playoffs = state.pendingSeasonTransition?.playoffs || state.lastPlayoffs || [];

    const archive = {
        season: state.season,
        champion: divisions.find(division => division.id === 1)?.champion || null,
        divisions,
        movements: movements.map(movement => ({ ...movement })),
        playoffs: playoffs.map(playoff => ({
            ...playoff,
            legs: (playoff.legs || []).map(leg => ({ ...leg })),
            extraTime: playoff.extraTime ? { ...playoff.extraTime } : null,
            penalties: playoff.penalties ? { ...playoff.penalties } : null
        })),
        players: state.standings.flatMap(team => team.squad.map(player => ({
            id: player.id,
            teamId: team.id,
            teamName: team.name,
            divisionId: team.divisionId,
            name: player.name,
            role: player.role,
            age: player.age,
            rating: player.rating,
            potential: player.potential,
            appearances: player.appearances || 0,
            goals: player.goals || 0,
            assists: player.assists || 0,
            cleanSheets: player.cleanSheets || 0,
            yellowCards: player.yellowCards || 0,
            redCards: player.redCards || 0
        }))),
        matches: state.matchLog.map(match => ({
            week: match.week,
            divisionId: match.divisionId,
            homeId: match.homeId,
            awayId: match.awayId,
            homeShort: match.homeShort,
            awayShort: match.awayShort,
            homeGoals: match.homeGoals,
            awayGoals: match.awayGoals,
            lineup: match.lineup ? {
                home: (match.lineup.home || []).map(player => ({
                    ...player,
                    comparison: player.comparison ? { ...player.comparison } : null
                })),
                away: (match.lineup.away || []).map(player => ({
                    ...player,
                    comparison: player.comparison ? { ...player.comparison } : null
                }))
            } : null,
            aiDecision: match.aiDecision ? {
                home: {
                    ...match.aiDecision.home,
                    rested: (match.aiDecision.home.rested || []).map(player => ({ ...player }))
                },
                away: {
                    ...match.aiDecision.away,
                    rested: (match.aiDecision.away.rested || []).map(player => ({ ...player }))
                }
            } : null,
            stats: match.stats ? { ...match.stats } : null
        })),
        playerLifecycle: null
    };
    state.seasonHistory.push(archive);
    return archive;
}

function getDivisionSizes(standings) {
    const sizes = {};
    standings.forEach(team => {
        sizes[team.divisionId] = (sizes[team.divisionId] || 0) + 1;
    });
    return sizes;
}

function validateMovementPlan(movements, divisions, standings) {
    const movedTeams = new Set();
    const movementCounts = new Map();
    const divisionIds = divisions.map(division => division.id);
    for (const movement of movements) {
        if (movedTeams.has(movement.teamId)) {
            return "Satu klub tercatat berpindah lebih dari satu kali; transisi musim dibatalkan.";
        }
        movedTeams.add(movement.teamId);
        if (!divisionIds.includes(movement.from) || !divisionIds.includes(movement.to) ||
            Math.abs(movement.from - movement.to) !== 1) {
            return "Rencana perpindahan divisi tidak valid; transisi musim dibatalkan.";
        }
        const team = standings.find(item => item.id === movement.teamId);
        if (!team || team.divisionId !== movement.from) {
            return "Kondisi klub berubah setelah hasil akhir dibuat; proses akhir musim ulangi kembali.";
        }
        const boundary = Math.min(movement.from, movement.to);
        const counts = movementCounts.get(boundary) || { up: 0, down: 0 };
        if (movement.to < movement.from) counts.up++;
        else counts.down++;
        movementCounts.set(boundary, counts);
    }
    for (const [boundary, counts] of movementCounts) {
        if (counts.up !== counts.down) {
            return `Perpindahan di batas Kasta ${boundary}/${boundary + 1} tidak seimbang.`;
        }
    }
    const sizes = getDivisionSizes(standings);
    for (const division of divisions) {
        if (!sizes[division.id]) return `Kasta ${division.id} tidak memiliki klub.`;
    }
    return "";
}

function processSeasonEnd() {
    if (!isSeasonComplete()) {
        showToast("Selesaikan seluruh pertandingan musim ini terlebih dahulu");
        return;
    }
    if (state.pendingSeasonTransition) return;

    const rules = normalizeDivisionMovements(state.divisions);
    const ruleError = validateDivisionMovementRules(
        rules,
        getDivisionSizes(state.standings),
        state.standings
    );
    if (ruleError) {
        showToast(ruleError);
        return;
    }
    const plan = createPromotionAndRelegationPlan(rules);
    const planError = validateMovementPlan(plan.movements, state.divisions, state.standings);
    if (planError) {
        showToast(planError);
        return;
    }

    state.pendingSeasonTransition = {
        season: state.season,
        movements: plan.movements,
        playoffs: plan.playoffs
    };
    state.lastMovements = plan.movements;
    state.lastMovementSeason = state.season;
    state.lastPlayoffs = plan.playoffs;
    state.playoffHistory.push(...plan.playoffs);
    saveState(false);
    showToast("Hasil akhir musim siap ditinjau");
    setView("overview");
}

function getNextSeason(season) {
    const match = /^(\d{4})\/(\d{2})$/.exec(season);
    if (!match) return "2027/28";
    const startYear = Number(match[1]);
    return `${startYear + 1}/${String(startYear + 2).slice(-2)}`;
}

function createGeneratedPlayer(team, role, age) {
    const sequence = Math.max(1, Number(team.nextPlayerSequence) || 1);
    const seed = team.id * 211 + sequence * 23;
    const firstName = PLAYER_FIRST_NAMES[Math.floor(seededValue(seed) * PLAYER_FIRST_NAMES.length)];
    const lastName = PLAYER_LAST_NAMES[Math.floor(seededValue(seed + 1) * PLAYER_LAST_NAMES.length)];
    const usedNames = new Set(team.squad.map(player => player.name));
    const baseName = `${firstName} ${lastName}`;
    let name = baseName;
    let suffix = sequence;
    while (usedNames.has(name)) name = `${baseName} ${suffix++}`;
    const rating = 58 + Math.floor(seededValue(seed + 2) * 9);
    const potential = Math.min(95, Math.max(rating + 5, 74 + Math.floor(seededValue(seed + 3) * 19)));

    team.nextPlayerSequence = sequence + 1;
    return {
        id: `${team.id}-${sequence}`,
        name,
        role,
        rating,
        fitness: 92,
        age: age || (16 + Math.floor(seededValue(seed + 4) * 3)),
        potential,
        retirementAge: 36 + Math.floor(seededValue(seed + 5) * 4),
        lastSeasonChange: 0,
        goals: 0,
        assists: 0,
        appearances: 0,
        cleanSheets: 0,
        yellowCards: 0,
        redCards: 0
    };
}

function getLeastRepresentedPlayerRole(squad) {
    return [...PLAYER_ROLES].sort((a, b) =>
        squad.filter(player => player.role === a).length -
        squad.filter(player => player.role === b).length
    )[0];
}

function getRoleForSquadDepthNeed(squad) {
    const groups = Object.keys(SQUAD_DEPTH_TARGETS).map(group => ({
        group,
        count: squad.filter(player => getPlayerPositionGroup(player.role) === group).length,
        target: SQUAD_DEPTH_TARGETS[group]
    }));
    const need = groups.sort((a, b) => (b.target - b.count) - (a.target - a.count))[0];
    if (!need || need.count >= need.target) return getLeastRepresentedPlayerRole(squad);
    return PLAYER_ROLES
        .filter(role => getPlayerPositionGroup(role) === need.group)
        .sort((a, b) =>
            squad.filter(player => player.role === a).length -
            squad.filter(player => player.role === b).length
        )[0];
}

function processPlayerSeasonLifecycle() {
    const squadLimit = Math.max(11, Math.min(25, Number(state.rules.squadLimit) || 25));
    const targetSquadSize = Math.min(
        squadLimit,
        Object.values(SQUAD_DEPTH_TARGETS).reduce((total, target) => total + target, 0)
    );
    const report = {
        season: state.season,
        clubs: [],
        retirements: [],
        growthCount: 0,
        declineCount: 0
    };

    state.standings.forEach(team => {
        const clubReport = {
            teamId: team.id,
            teamName: team.name,
            growth: [],
            declines: [],
            retirements: [],
            arrivals: []
        };
        const retiredPlayers = [];
        team.squad.forEach(player => {
            player.age = Number(player.age) || 18;
            player.potential = Math.max(player.rating, Number(player.potential) || player.rating);
            player.retirementAge = Number(player.retirementAge) || 36;
            player.age += 1;
            player.lastSeasonChange = 0;
            if (player.age >= player.retirementAge) {
                retiredPlayers.push(player);
                return;
            }

            const previousRating = player.rating;
            if (player.age <= 23 && player.rating < player.potential && Math.random() < 0.7) {
                player.rating = Math.min(player.potential, player.rating + 1);
            } else if (player.age >= 30 && player.rating > 55 && Math.random() < 0.5) {
                player.rating -= 1;
            }
            player.lastSeasonChange = player.rating - previousRating;
            player.fitness = Math.max(90, Number(player.fitness) || 92);
            if (player.lastSeasonChange > 0) {
                clubReport.growth.push({
                    name: player.name,
                    age: player.age,
                    from: previousRating,
                    to: player.rating
                });
            } else if (player.lastSeasonChange < 0) {
                clubReport.declines.push({
                    name: player.name,
                    age: player.age,
                    from: previousRating,
                    to: player.rating
                });
            }
        });

        team.squad = team.squad.filter(player => !retiredPlayers.includes(player));
        retiredPlayers.forEach(player => {
            const retirement = {
                season: state.season,
                teamId: team.id,
                teamName: team.name,
                name: player.name,
                role: player.role,
                age: player.age,
                rating: player.rating
            };
            clubReport.retirements.push(retirement);
            report.retirements.push(retirement);
            if (team.squad.length < squadLimit) {
                const replacement = createGeneratedPlayer(team, player.role, 16);
                team.squad.push(replacement);
                clubReport.arrivals.push({
                    ...replacement,
                    replacementFor: player.name,
                    reason: `Mengganti pemain pensiun di posisi ${player.role}.`
                });
            }
        });

        while (team.squad.length < 11) {
            const role = getRoleForSquadDepthNeed(team.squad);
            const youth = createGeneratedPlayer(team, role, 16);
            team.squad.push(youth);
            clubReport.arrivals.push({
                ...youth,
                replacementFor: null,
                reason: "Menjaga skuad minimum agar klub dapat bertanding."
            });
        }

        let academyAdditions = 0;
        while (team.squad.length < targetSquadSize &&
            team.squad.length < squadLimit &&
            academyAdditions < MAX_ACADEMY_ADDITIONS_PER_SEASON) {
            const role = getRoleForSquadDepthNeed(team.squad);
            const group = getPlayerPositionGroup(role);
            const groupCount = team.squad.filter(player =>
                getPlayerPositionGroup(player.role) === group).length;
            const youth = createGeneratedPlayer(team, role);
            team.squad.push(youth);
            clubReport.arrivals.push({
                ...youth,
                replacementFor: null,
                reason: `Kedalaman ${SQUAD_DEPTH_LABELS[group]} ${groupCount}/${SQUAD_DEPTH_TARGETS[group]}; menambah pelapis.`
            });
            academyAdditions += 1;
        }

        report.growthCount += clubReport.growth.length;
        report.declineCount += clubReport.declines.length;
        report.clubs.push(clubReport);
        calculateTeamRatings(team);
    });

    return report;
}

function simulatePlayoffTie(teamA, teamB, legLabel) {
    const leg1 = simulateDetailedMatch(teamA, teamB, true, legLabel);
    const leg2 = simulateDetailedMatch(teamB, teamA, true, legLabel);
    const teamATotal = leg1.homeGoals + leg2.awayGoals;
    const teamBTotal = leg1.awayGoals + leg2.homeGoals;
    let finalTeamATotal = teamATotal;
    let finalTeamBTotal = teamBTotal;
    let extraTime = null;
    let penalties = null;
    let winner = teamATotal > teamBTotal ? teamA : teamB;

    if (teamATotal === teamBTotal) {
        extraTime = {
            teamAGoals: poisson(Math.max(0.05, 1.2 + (teamA.attackRating - teamB.defenseRating) / 30) / 3),
            teamBGoals: poisson(Math.max(0.05, 1.2 + (teamB.attackRating - teamA.defenseRating) / 30) / 3)
        };
        finalTeamATotal += extraTime.teamAGoals;
        finalTeamBTotal += extraTime.teamBGoals;
        if (finalTeamATotal === finalTeamBTotal) {
            penalties = simulatePenaltyShootout(teamA, teamB);
            winner = penalties.teamAGoals > penalties.teamBGoals ? teamA : teamB;
        } else {
            winner = finalTeamATotal > finalTeamBTotal ? teamA : teamB;
        }
    }

    return {
        type: "",
        teamAId: teamA.id,
        teamBId: teamB.id,
        teamAName: teamA.name,
        teamBName: teamB.name,
        teamATotal,
        teamBTotal,
        finalTeamATotal,
        finalTeamBTotal,
        extraTime,
        penalties,
        decidedBy: penalties ? "Adu penalti" : extraTime ? "Perpanjangan waktu" : "Agregat",
        winnerId: winner.id,
        winnerName: winner.name,
        legs: [
            { homeId: teamA.id, awayId: teamB.id, homeGoals: leg1.homeGoals, awayGoals: leg1.awayGoals },
            { homeId: teamB.id, awayId: teamA.id, homeGoals: leg2.homeGoals, awayGoals: leg2.awayGoals }
        ]
    };
}

function simulatePenaltyShootout(teamA, teamB) {
    let teamAGoals = 0;
    let teamBGoals = 0;
    let teamAAttempts = 0;
    let teamBAttempts = 0;
    const takePenalty = (attacker, goalkeeper) => {
        const chance = Math.max(0.62, Math.min(0.88,
            0.75 + ((attacker.attackRating || attacker.rating) -
                (goalkeeper.defenseRating || goalkeeper.rating)) * 0.002));
        return Math.random() < chance;
    };

    for (let attempt = 0; attempt < 5; attempt++) {
        teamAAttempts++;
        if (takePenalty(teamA, teamB)) teamAGoals++;
        teamBAttempts++;
        if (takePenalty(teamB, teamA)) teamBGoals++;
        const remainingKicks = 4 - attempt;
        if (teamAGoals > teamBGoals + remainingKicks ||
            teamBGoals > teamAGoals + remainingKicks) break;
    }
    while (teamAGoals === teamBGoals && teamAAttempts === teamBAttempts) {
        teamAAttempts++;
        if (takePenalty(teamA, teamB)) teamAGoals++;
        teamBAttempts++;
        if (takePenalty(teamB, teamA)) teamBGoals++;
    }
    return {
        teamAGoals,
        teamBGoals,
        teamAAttempts,
        teamBAttempts
    };
}

function simulateInternalPlayoffCandidates(candidates, legLabel) {
    let currentTeams = [...candidates];
    const matches = [];
    if (currentTeams.length < 2) return { winner: currentTeams[0] || null, matches };

    while (currentTeams.length > 1) {
        const nextTeams = [];
        const pairCount = Math.floor(currentTeams.length / 2);
        for (let index = 0; index < pairCount; index++) {
            const teamA = currentTeams[index];
            const teamB = currentTeams[currentTeams.length - 1 - index];
            const tie = simulatePlayoffTie(teamA, teamB, legLabel);
            tie.type = "Play-off internal";
            matches.push(tie);
            nextTeams.push(tie.winnerId === teamA.id ? teamA : teamB);
        }
        if (currentTeams.length % 2 !== 0) nextTeams.push(currentTeams[pairCount]);
        currentTeams = nextTeams;
    }

    return { winner: currentTeams[0] || null, matches };
}

function createPromotionAndRelegationPlan(rules) {
    const movementByTeam = new Map();
    const playoffHistory = [];

    rules.forEach(rule => {
        const upperTeams = state.standings
            .filter(team => team.divisionId === rule.upperDivisionId)
            .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
        const lowerTeams = state.standings
            .filter(team => team.divisionId === rule.lowerDivisionId)
            .sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
        const setMovement = (team, to, type) => {
            if (!team) return;
            if (movementByTeam.has(team.id)) return;
            movementByTeam.set(team.id, {
                teamId: team.id,
                from: team.divisionId,
                to,
                type
            });
        };

        if (rule.mode === "auto") {
            lowerTeams.slice(0, rule.promotedCount).forEach(team => {
                setMovement(team, rule.upperDivisionId, "Promosi");
            });
            (rule.relegatedCount > 0 ? upperTeams.slice(-rule.relegatedCount) : []).forEach(team => {
                setMovement(team, rule.lowerDivisionId, "Degradasi");
            });
            return;
        }

        if (rule.mode === "internal_playoff") {
            lowerTeams.slice(0, rule.promotedCount).forEach(team => {
                setMovement(team, rule.upperDivisionId, "Promosi langsung");
            });
            (rule.relegatedCount > 0 ? upperTeams.slice(-rule.relegatedCount) : []).forEach(team => {
                setMovement(team, rule.lowerDivisionId, "Degradasi langsung");
            });
            const candidates = lowerTeams.slice(
                rule.promotedCount,
                rule.promotedCount + rule.playoffSpots
            );
            const playoff = simulateInternalPlayoffCandidates(
                candidates,
                `${state.season} · Kasta ${rule.lowerDivisionId} → ${rule.upperDivisionId}`
            );
            playoff.matches.forEach(match => {
                playoffHistory.push({
                    season: state.season,
                    mode: "internal_playoff",
                    upperDivisionId: rule.upperDivisionId,
                    lowerDivisionId: rule.lowerDivisionId,
                    ...match
                });
            });
            if (playoff.winner) {
                setMovement(playoff.winner, rule.upperDivisionId, "Promosi play-off internal");
            }
            return;
        }

        if (rule.mode === "cross_playoff") {
            lowerTeams.slice(0, rule.promotedCount).forEach(team => {
                setMovement(team, rule.upperDivisionId, "Promosi langsung");
            });
            (rule.relegatedCount > 0 ? upperTeams.slice(-rule.relegatedCount) : []).forEach(team => {
                setMovement(team, rule.lowerDivisionId, "Degradasi langsung");
            });

            const lowerIndex = rule.crossPlayoffPosition - 1;
            const upperIndex = upperTeams.length - rule.crossPlayoffPosition;
            const lowerCandidate = lowerTeams[lowerIndex];
            const upperCandidate = upperTeams[upperIndex];
            if (lowerCandidate && upperCandidate &&
                !movementByTeam.has(lowerCandidate.id) &&
                !movementByTeam.has(upperCandidate.id)) {
                const tie = simulatePlayoffTie(
                    lowerCandidate,
                    upperCandidate,
                    `${state.season} · Kasta ${rule.lowerDivisionId} ↔ ${rule.upperDivisionId}`
                );
                tie.type = "Play-off lintas kasta";
                playoffHistory.push({
                    season: state.season,
                    mode: "cross_playoff",
                    upperDivisionId: rule.upperDivisionId,
                    lowerDivisionId: rule.lowerDivisionId,
                    ...tie
                });
                if (tie.winnerId === lowerCandidate.id) {
                    setMovement(lowerCandidate, rule.upperDivisionId, "Promosi play-off lintas kasta");
                    setMovement(upperCandidate, rule.lowerDivisionId, "Degradasi play-off lintas kasta");
                }
            }
        }
    });

    return { movements: [...movementByTeam.values()], playoffs: playoffHistory };
}

function updateStandings(team, scored, conceded) {
    team.p += 1;
    team.gf += scored;
    team.ga += conceded;
    if (scored > conceded) {
        team.w += 1;
        team.pts += state.rules.pointsWin;
    } else if (scored === conceded) {
        team.d += 1;
        team.pts += state.rules.pointsDraw;
    } else {
        team.l += 1;
    }
}

document.querySelectorAll("[data-view]").forEach(button =>
    button.addEventListener("click", () => setView(button.dataset.view)));

document.querySelectorAll("[data-start-action]").forEach(button => {
    button.addEventListener("click", () => {
        if (button.dataset.startAction === "continue") launchGame();
        if (button.dataset.startAction === "new") openSetup("new");
        if (button.dataset.startAction === "editor") {
            if (state && !canEditLeague()) {
                showToast("Editor tim tersedia setelah perpindahan musim selesai");
                return;
            }
            openSetup("editor");
        }
    });
});

document.getElementById("leagueEditorButton").addEventListener("click", () => openSetup("editor", true));
document.getElementById("saveButton").addEventListener("click", () => saveState(true));
document.getElementById("resetButton").addEventListener("click", () => {
    if (!confirm("Kembali ke menu utama? Save liga tetap tersimpan.")) return;
    showStartScreen();
});

showStartScreen();
