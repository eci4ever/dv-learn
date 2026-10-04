import { describe, expect, it } from "vitest";
import { ipv4Subnet, isPrivateIPv4, parseIPv4 } from "../../src/lib/ip-address";

describe("IPv4 practice", () => {
	it("accepts four decimal octets and rejects invalid or ambiguous input", () => {
		expect(parseIPv4(" 192.168.1.130 ")).toEqual([192, 168, 1, 130]);
		for (const address of [
			"",
			"192.168.1",
			"256.1.1.1",
			"01.1.1.1",
			"1.-1.1.1",
			"1.1.1.1/24",
			"1e2.1.1.1",
		])
			expect(parseIPv4(address)).toBeNull();
	});
	it("checks all private range boundaries without labelling other special addresses public", () => {
		for (const address of [
			"10.0.0.0",
			"10.255.255.255",
			"172.16.0.0",
			"172.31.255.255",
			"192.168.0.0",
			"192.168.255.255",
		])
			expect(isPrivateIPv4(parseIPv4(address) ?? [])).toBe(true);
		for (const address of [
			"172.15.255.255",
			"172.32.0.0",
			"127.0.0.1",
			"169.254.0.1",
			"8.8.8.8",
		])
			expect(isPrivateIPv4(parseIPv4(address) ?? [])).toBe(false);
	});
	it("calculates network, broadcast and host range", () => {
		expect(ipv4Subnet("192.168.1.130", 26)).toEqual({
			network: "192.168.1.128",
			mask: "255.255.255.192",
			last: "192.168.1.191",
			total: 64,
			hosts: 62,
			firstHost: "192.168.1.129",
			lastHost: "192.168.1.190",
		});
	});
	it("handles /0, /31, /32 and invalid prefixes without signed overflow", () => {
		expect(ipv4Subnet("255.255.255.255", 0)).toMatchObject({
			network: "0.0.0.0",
			last: "255.255.255.255",
			total: 4294967296,
		});
		expect(ipv4Subnet("192.168.1.131", 31)).toMatchObject({
			hosts: 2,
			firstHost: "192.168.1.130",
			lastHost: "192.168.1.131",
		});
		expect(ipv4Subnet("255.255.255.255", 32)).toMatchObject({
			hosts: 1,
			network: "255.255.255.255",
			mask: "255.255.255.255",
		});
		for (const prefix of [-1, 33, 2.5, Number.NaN])
			expect(ipv4Subnet("1.2.3.4", prefix)).toBeNull();
		expect(ipv4Subnet("bad", 24)).toBeNull();
	});
});
