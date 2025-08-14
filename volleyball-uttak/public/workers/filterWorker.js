// public/workers/filterWorker.js
self.onmessage = function (e) {
  const { players, filters, searchTerm } = e.data;

  try {
    const filteredPlayers = players.filter((player) => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = player.name?.toLowerCase().includes(searchLower);
        const matchesNumber =
          player.registrationNumber?.includes(searchTerm) ||
          // Søk på navn
          player.name?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesName && !matchesNumber) {
          return false;
        }
      }

      // Gender filter
      if (filters.gender !== "all") {
        const playerGender = player.gender?.toLowerCase();
        if (filters.gender === "male" && !playerGender?.includes("mann")) {
          return false;
        }
        if (filters.gender === "female" && !playerGender?.includes("kvinne")) {
          return false;
        }
      }

      // Student filter
      if (filters.isStudent !== "all") {
        const playerIsStudent = player.isStudent?.toLowerCase();
        if (filters.isStudent === "yes" && !playerIsStudent?.includes("ja")) {
          return false;
        }
        if (filters.isStudent === "no" && playerIsStudent?.includes("ja")) {
          return false;
        }
      }

      // Previous team filter
      if (filters.previousTeam !== "all") {
        if (filters.previousTeam === "none" && player.previousTeam) {
          return false;
        }
        if (
          filters.previousTeam !== "none" &&
          player.previousTeam !== filters.previousTeam
        ) {
          return false;
        }
      }

      // Desired level filter
      if (
        filters.desiredLevel !== "all" &&
        player.desiredLevel !== filters.desiredLevel
      ) {
        return false;
      }

      // Position filter
      if (filters.desiredPosition !== "all") {
        const playerPositions = player.desiredPositions?.toLowerCase() || "";
        if (!playerPositions.includes(filters.desiredPosition.toLowerCase())) {
          return false;
        }
      }

      // Age group filter
      if (filters.ageGroup !== "all") {
        const currentYear = new Date().getFullYear();
        let playerYear = null;

        if (player.year) {
          playerYear = parseInt(player.year);
        } else if (player.birthDate) {
          const yearMatch = player.birthDate.match(/(\d{4})/);
          if (yearMatch) {
            playerYear = parseInt(yearMatch[1]);
          }
        }

        if (playerYear) {
          const age = currentYear - playerYear;
          if (filters.ageGroup === "under20" && age >= 20) return false;
          if (filters.ageGroup === "20to25" && (age < 20 || age > 25))
            return false;
          if (filters.ageGroup === "over25" && age <= 25) return false;
        }
      }

      return true;
    });

    self.postMessage({ success: true, result: filteredPlayers });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
