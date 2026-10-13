import { useId, useState } from "react";
import { ipv4Subnet, isPrivateIPv4, parseIPv4 } from "../lib/ip-address";
import { useLessonCopy } from "./lesson-language";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect, NativeSelectOption } from "./ui/native-select";
import { Progress } from "./ui/progress";

const octetPositions = [0, 1, 2, 3];
const prefixes = Array.from({ length: 33 }, (_, value) => value);

const questions = [
	{
		question: "Which IPv4 address is valid?",
		questionMs: "Alamat IPv4 manakah yang sah?",
		choices: ["192.168.1.10", "192.168.1.256", "192.168.1", "192.168.-1.10"],
		answer: 0,
		explanation: "IPv4 has four octets. Each octet is a number from 0 to 255.",
		explanationMs:
			"IPv4 mempunyai empat octet. Setiap octet ialah nombor antara 0 hingga 255.",
	},
	{
		question: "Which address belongs to an RFC 1918 private range?",
		questionMs: "Alamat manakah dalam julat private address RFC 1918?",
		choices: ["172.32.0.1", "172.16.0.1", "8.8.8.8", "127.0.0.1"],
		answer: 1,
		explanation:
			"172.16.0.0 through 172.31.255.255 is private. 127.0.0.1 is loopback, not RFC 1918 private space.",
		explanationMs:
			"172.16.0.0 hingga 172.31.255.255 ialah private address. 127.0.0.1 ialah loopback, bukan dalam julat private address RFC 1918.",
	},
	{
		question: "How many network bits does /24 specify?",
		questionMs: "Berapakah bilangan network bit yang ditentukan oleh /24?",
		choices: ["8", "16", "24", "32"],
		answer: 2,
		explanation:
			"The CIDR prefix counts network bits. IPv4 has 32 bits, so /24 leaves 8 host bits.",
		explanationMs:
			"CIDR prefix mengira network bit. IPv4 mempunyai 32 bit, jadi /24 meninggalkan 8 host bit.",
	},
	{
		question: "What is the network address of 192.168.1.130/26?",
		questionMs: "Apakah network address bagi 192.168.1.130/26?",
		choices: ["192.168.1.0", "192.168.1.64", "192.168.1.130", "192.168.1.128"],
		answer: 3,
		explanation:
			"A /26 block has 64 addresses. This block runs from 192.168.1.128 to 192.168.1.191.",
		explanationMs:
			"Blok /26 mempunyai 64 alamat. Blok ini bermula dari 192.168.1.128 hingga 192.168.1.191.",
	},
	{
		question:
			"How many usable host addresses are in a conventional /24 subnet?",
		questionMs:
			"Berapakah bilangan host address yang boleh digunakan dalam subnet /24 biasa?",
		choices: ["256", "254", "24", "255"],
		answer: 1,
		explanation:
			"There are 256 addresses. The network and broadcast addresses leave 254 usable host addresses. /31 and /32 have different rules.",
		explanationMs:
			"Terdapat 256 alamat. Selepas mengecualikan network address dan broadcast address, 254 host address boleh digunakan. /31 dan /32 mempunyai peraturan berbeza.",
	},
];

function Quiz() {
	const copy = useLessonCopy();
	const [answers, setAnswers] = useState<Record<number, number>>({});
	const [checked, setChecked] = useState(false);
	const answered = Object.keys(answers).length;
	const score = questions.filter((q, i) => answers[i] === q.answer).length;
	const id = useId();
	return (
		<div className="grid gap-6">
			<p>
				{copy(
					"Choose one answer for each question, then check your answers. You can retry as often as you like.",
					"Pilih satu jawapan bagi setiap soalan, kemudian semak jawapan anda. Anda boleh mencuba semula tanpa had.",
				)}
			</p>
			<Progress
				aria-label={copy("Questions answered", "Soalan dijawab")}
				value={(answered / questions.length) * 100}
			/>
			<p>
				{copy(
					"{count} of {total} questions answered",
					"{count} daripada {total} soalan dijawab",
				)
					.replace("{count}", String(answered))
					.replace("{total}", String(questions.length))}
			</p>
			{questions.map((q, i) => (
				<fieldset key={q.question} className="grid gap-3 rounded-lg border p-4">
					<legend className="px-1 font-semibold">
						{i + 1}. {copy(q.question, q.questionMs)}
					</legend>
					{q.choices.map((choice, j) => (
						<Label
							key={choice}
							className="flex min-h-11 items-center gap-3 rounded-md border p-3"
						>
							<input
								type="radio"
								name={`${id}-${i}`}
								checked={answers[i] === j}
								onChange={() => {
									setAnswers({ ...answers, [i]: j });
									setChecked(false);
								}}
							/>
							{choice}
						</Label>
					))}
					{checked && (
						<p>
							{answers[i] === q.answer
								? copy("Correct.", "Betul.")
								: copy(
										"Not quite. The correct answer is {answer}.",
										"Belum tepat. Jawapan yang betul ialah {answer}.",
									).replace("{answer}", q.choices[q.answer])}{" "}
							{copy(q.explanation, q.explanationMs)}
						</p>
					)}
				</fieldset>
			))}
			<div className="flex flex-wrap gap-3">
				<Button
					disabled={answered !== questions.length}
					onClick={() => setChecked(true)}
				>
					{copy("Check answers", "Semak jawapan")}
				</Button>
				<Button
					variant="outline"
					onClick={() => {
						setAnswers({});
						setChecked(false);
					}}
				>
					{copy("Reset quiz", "Set semula kuiz")}
				</Button>
			</div>
			{checked && (
				<Alert role="status">
					<AlertDescription>
						{copy(
							"You scored {score} out of {total}.",
							"Skor anda ialah {score} daripada {total}.",
						)
							.replace("{score}", String(score))
							.replace("{total}", String(questions.length))}{" "}
						{score === questions.length
							? copy(
									"Well done. Try the subnet lab with a new address.",
									"Bagus. Cuba latihan subnet dengan alamat baharu.",
								)
							: copy(
									"Review the explanations and try again.",
									"Semak penerangan dan cuba lagi.",
								)}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}

export function IPAddressLab({
	mode,
}: {
	mode: "ipv4" | "private" | "subnet" | "quiz";
}) {
	const copy = useLessonCopy();
	const [address, setAddress] = useState("192.168.1.130");
	const [prefix, setPrefix] = useState(24);
	const id = useId();
	const octets = parseIPv4(address);
	const subnet = ipv4Subnet(address, prefix);
	return (
		<Card className="ip-lab my-8 min-w-0">
			<CardHeader>
				<Badge variant="secondary" className="w-fit">
					{copy("Interactive practice", "Latihan interaktif")}
				</Badge>
				<CardTitle>
					<h2>
						{mode === "quiz"
							? copy("Check your understanding", "Semak pemahaman anda")
							: mode === "subnet"
								? copy("Subnet explorer", "Peneroka subnet")
								: mode === "private"
									? copy("Private address checker", "Penyemak private address")
									: copy("IPv4 explorer", "Peneroka IPv4")}
					</h2>
				</CardTitle>
			</CardHeader>
			<CardContent className="grid gap-5">
				{mode === "quiz" ? (
					<Quiz />
				) : (
					<>
						<Label htmlFor={`${id}-address`}>
							{copy("IPv4 address", "Alamat IPv4")}
						</Label>
						<Input
							id={`${id}-address`}
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder="192.168.1.130"
							aria-invalid={!octets}
							aria-describedby={!octets ? `${id}-error` : `${id}-hint`}
						/>
						<p id={`${id}-hint`}>
							{copy(
								"Enter four numbers from 0 to 255, separated by dots. Do not use leading zeros. No network requests are sent.",
								"Masukkan empat nombor antara 0 hingga 255, dipisahkan dengan titik. Jangan gunakan sifar di hadapan nombor. Tiada network request dihantar.",
							)}
						</p>
						{!octets && (
							<p id={`${id}-error`} role="status">
								{copy(
									"Enter a valid IPv4 address, such as 192.168.1.130.",
									"Masukkan alamat IPv4 yang sah, seperti 192.168.1.130.",
								)}
							</p>
						)}
						{mode === "ipv4" && octets && (
							<div className="grid gap-3 sm:grid-cols-2">
								{octetPositions.map((index) => (
									<div key={`${id}-${index}`} className="rounded-md border p-4">
										<p>Octet {index + 1}</p>
										<strong className="text-2xl tabular-nums">
											{octets[index]}
										</strong>
										<p className="font-mono tabular-nums">
											{octets[index].toString(2).padStart(8, "0")}
										</p>
										<Progress
											aria-label={copy(
												"Octet {index} value out of 255",
												"Nilai octet {index} daripada 255",
											).replace("{index}", String(index + 1))}
											value={(octets[index] / 255) * 100}
										/>
									</div>
								))}
								<p className="sm:col-span-2">
									{copy(
										"Four 8-bit octets make a 32-bit IPv4 address. Each binary digit represents a power of two.",
										"Empat octet 8-bit membentuk alamat IPv4 32-bit. Setiap digit binary mewakili kuasa dua.",
									)}
								</p>
							</div>
						)}
						{mode === "private" && octets && (
							<>
								<Alert role="status">
									<AlertDescription>
										{isPrivateIPv4(octets)
											? copy(
													"RFC 1918 private address. This address is not globally routed on the public internet.",
													"Private address RFC 1918. Alamat ini tidak dirutekan secara global di internet awam.",
												)
											: copy(
													"Not an RFC 1918 private address. This does not necessarily mean it is public: loopback, link-local, shared, documentation and other special-purpose ranges also exist.",
													"Bukan private address RFC 1918. Ini tidak semestinya bermaksud alamat ini public: julat loopback, link-local, shared, documentation dan julat khas lain juga wujud.",
												)}
									</AlertDescription>
								</Alert>
								<ul className="list-disc pl-6">
									<li>10.0.0.0–10.255.255.255 (/8)</li>
									<li>172.16.0.0–172.31.255.255 (/12)</li>
									<li>192.168.0.0–192.168.255.255 (/16)</li>
								</ul>
								<p>
									{copy(
										"Try 172.15.255.255 and 172.16.0.0 to explore a private range boundary.",
										"Cuba 172.15.255.255 dan 172.16.0.0 untuk meneroka sempadan julat private address.",
									)}
								</p>
							</>
						)}
						{mode === "subnet" && (
							<>
								<Label htmlFor={`${id}-prefix`}>CIDR prefix</Label>
								<NativeSelect
									id={`${id}-prefix`}
									value={prefix}
									onChange={(e) => setPrefix(Number(e.target.value))}
								>
									{prefixes.map((i) => (
										<NativeSelectOption key={i} value={i}>
											/{i}
										</NativeSelectOption>
									))}
								</NativeSelect>
								{subnet && (
									<dl
										className="grid gap-3 rounded-md border p-4"
										aria-live="polite"
									>
										{Object.entries({
											"Subnet mask": subnet.mask,
											"Network address": subnet.network,
											[prefix >= 31
												? "Last address (no broadcast)"
												: "Broadcast address"]: subnet.last,
											[copy("Total addresses", "Jumlah alamat")]:
												subnet.total.toLocaleString(copy("en-MY", "ms-MY")),
											[copy("Usable hosts", "Host boleh digunakan")]:
												subnet.hosts.toLocaleString(copy("en-MY", "ms-MY")),
											"Host range": `${subnet.firstHost} – ${subnet.lastHost}`,
										}).map(([label, value]) => (
											<div key={label}>
												<dt className="font-semibold">{label}</dt>
												<dd className="break-words font-mono tabular-nums">
													{value}
												</dd>
											</div>
										))}
									</dl>
								)}
								<p>
									{prefix === 31
										? copy(
												"/31 is used on point-to-point links. Both addresses can be endpoints; there is no subnet broadcast.",
												"/31 digunakan pada sambungan point-to-point. Kedua-dua alamat boleh menjadi endpoint; tiada subnet broadcast.",
											)
										: prefix === 32
											? copy(
													"/32 identifies a single address, commonly a host route.",
													"/32 mengenal pasti satu alamat, biasanya sebagai host route.",
												)
											: copy(
													"For a conventional subnet, reserve the first address for the network and the last for broadcast. Actual assignment and routing depend on network configuration.",
													"Bagi subnet biasa, alamat pertama dikhaskan untuk network dan alamat terakhir untuk broadcast. Penetapan alamat dan routing sebenar bergantung pada konfigurasi network.",
												)}
								</p>
							</>
						)}
					</>
				)}
				<p className="text-muted-foreground">
					{copy(
						"Practice answers are kept only while this lesson is open. Changing lessons or refreshing resets them.",
						"Jawapan latihan hanya disimpan semasa pelajaran ini dibuka. Menukar pelajaran atau memuat semula halaman akan menetapkannya semula.",
					)}
				</p>
			</CardContent>
		</Card>
	);
}
