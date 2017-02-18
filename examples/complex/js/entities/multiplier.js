function Multiplier() {
    var multipliers = [-8, -4, -2, -1, 0, 1, 2, 4, 8];
    var initialMultiplierIndex = 3;
    var currentMultiplierIndex = initialMultiplierIndex;

    this.reset = function () {
        currentMultiplierIndex = initialMultiplierIndex;
    };

    this.next = function () {
        currentMultiplierIndex = Math.min(currentMultiplierIndex + 1, multipliers.length - 1);
        return multipliers[currentMultiplierIndex];
    };

    this.prev = function () {
        currentMultiplierIndex = Math.max(currentMultiplierIndex - 1, 0);
        return multipliers[currentMultiplierIndex];
    };

    this.currnet = function () {
        return multipliers[currentMultiplierIndex];
    }
}
