/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
const config = {
	preset: 'ts-jest',
	testEnvironment: 'jsdom',
	rootDir: 'test',
	transformIgnorePatterns: ["/node_modules/(?!(dexie)/)"],
	moduleNameMapper: {
		"^dexie$": require.resolve("dexie"),
	}
};


module.exports = config;
