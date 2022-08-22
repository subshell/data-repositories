/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	rootDir: 'test',
	transformIgnorePatterns: ["/node_modules/(?!(dexie)/)"],
	moduleNameMapper: {
		"^dexie$": require.resolve("dexie"),
	}
};
