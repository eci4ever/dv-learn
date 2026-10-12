export type GlossaryTerm = {
	term: string;
	definition: string;
	example: string;
};

// Authored help is optional content, not a course-specific player or access rule.
export const courseGlossaries: Record<string, readonly GlossaryTerm[]> = {
	"dns-fundamentals": [
		{
			term: "DNS",
			definition:
				"The Domain Name System stores information under names. One common use is finding an IP address for a website name.",
			example: "A lookup for learn.example can ask for its IPv4 address.",
		},
		{
			term: "Resolver",
			definition:
				"A service that finds DNS answers for your device. It can reuse cached answers or ask other DNS servers.",
			example:
				"Your device usually sends its DNS question to a recursive resolver.",
		},
		{
			term: "Authoritative server",
			definition:
				"A DNS server that answers using the records for a zone it serves, rather than merely reusing another server’s cached answer.",
			example:
				"An authoritative server for example.com can supply the zone’s www record.",
		},
		{
			term: "TTL",
			definition:
				"Time to live: the number of seconds a cached DNS record may be reused before it expires. A change at the authority does not immediately replace cached copies.",
			example:
				"With 60 seconds left on the TTL, a resolver may reuse its cached answer.",
		},
		{
			term: "Record",
			definition:
				"A named piece of DNS data with a type and value. Different types describe different kinds of information.",
			example:
				"An A record holds an IPv4 address; an MX record points to a mail server.",
		},
		{
			term: "Referral",
			definition:
				"A reply that directs a resolver to another set of DNS servers to continue its search. It is not the final address answer.",
			example:
				"A root server can direct the resolver to the servers for a top-level domain.",
		},
	],
};

export const courseGlossariesMs: Record<string, readonly GlossaryTerm[]> = {
	"dns-fundamentals": [
		{
			term: "DNS",
			definition:
				"Domain Name System menyimpan maklumat di bawah name. Salah satu kegunaannya ialah mencari IP address bagi name laman web.",
			example:
				"Lookup untuk learn.example boleh meminta IPv4 address name tersebut.",
		},
		{
			term: "Resolver",
			definition:
				"Perkhidmatan yang mencari jawapan DNS untuk device anda. Resolver boleh menggunakan semula cached answer atau bertanya kepada DNS server lain.",
			example:
				"Device anda biasanya menghantar soalan DNS kepada recursive resolver.",
		},
		{
			term: "Authoritative server",
			definition:
				"DNS server yang menjawab menggunakan record bagi zone yang dikendalikannya, bukan sekadar menggunakan semula cached answer daripada server lain.",
			example:
				"Authoritative server untuk example.com boleh memberikan www record bagi zone tersebut.",
		},
		{
			term: "TTL",
			definition:
				"Time to live: tempoh dalam saat sesuatu DNS record dalam cache boleh digunakan semula sebelum expiry. Perubahan pada authority tidak terus menggantikan salinan dalam cache.",
			example:
				"Jika baki TTL ialah 60 saat, resolver masih boleh menggunakan cached answer.",
		},
		{
			term: "Record",
			definition:
				"Maklumat DNS di bawah sesuatu name, dengan type dan value. Type yang berbeza menerangkan jenis maklumat yang berbeza.",
			example:
				"A record menyimpan IPv4 address; MX record merujuk kepada mail server.",
		},
		{
			term: "Referral",
			definition:
				"Reply yang mengarahkan resolver kepada kumpulan DNS server lain untuk meneruskan carian. Referral bukan address answer akhir.",
			example:
				"Root server boleh mengarahkan resolver kepada server untuk sesuatu top-level domain.",
		},
	],
};
