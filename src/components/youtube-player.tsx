import { useEffect, useRef } from "react";

interface Player {
	getCurrentTime(): number;
	destroy(): void;
}
interface Youtube {
	Player: new (
		element: HTMLElement,
		options: {
			videoId: string;
			playerVars: { start: number; origin: string; rel: number };
			events: { onStateChange(event: { data: number }): void };
		},
	) => Player;
}
declare global {
	interface Window {
		YT?: Youtube;
		onYouTubeIframeAPIReady?: () => void;
	}
}
let loader: Promise<Youtube> | undefined;
function loadYoutube(): Promise<Youtube> {
	if (window.YT?.Player) return Promise.resolve(window.YT);
	if (!loader)
		loader = new Promise((resolve, reject) => {
			window.onYouTubeIframeAPIReady = () => {
				if (window.YT) resolve(window.YT);
			};
			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			script.onerror = () => {
				loader = undefined;
				reject(new Error("Video tidak dapat dimuatkan."));
			};
			document.head.appendChild(script);
		});
	return loader;
}
export function YoutubePlayer({
	videoId,
	start,
	onProgress,
	onError,
}: {
	videoId: string;
	start: number;
	onProgress(position: number, completed: boolean): Promise<void>;
	onError(message: string): void;
}) {
	const container = useRef<HTMLDivElement>(null);
	const callbacks = useRef({ onProgress, onError });
	callbacks.current = { onProgress, onError };
	const initialPosition = useRef(start);
	useEffect(() => {
		let disposed = false;
		let player: Player | undefined;
		let lastSaved = -1;
		let saving = false;
		async function save(completed = false) {
			if (!player || saving) return;
			const position = Math.max(0, Math.floor(player.getCurrentTime()));
			if (!completed && Math.abs(position - lastSaved) < 5) return;
			saving = true;
			try {
				await callbacks.current.onProgress(position, completed);
				lastSaved = position;
			} catch {
				callbacks.current.onError("Kemajuan belum disimpan. Cuba sekali lagi.");
			} finally {
				saving = false;
			}
		}
		void loadYoutube()
			.then((youtube) => {
				if (disposed || !container.current) return;
				const target = document.createElement("div");
				container.current.appendChild(target);
				player = new youtube.Player(target, {
					videoId,
					playerVars: {
						start: Math.floor(initialPosition.current),
						origin: window.location.origin,
						rel: 0,
					},
					events: {
						onStateChange: ({ data }) => {
							if (data === 0 || data === 2) void save(data === 0);
						},
					},
				});
			})
			.catch((error: Error) => callbacks.current.onError(error.message));
		const timer = window.setInterval(() => {
			void save();
		}, 20_000);
		const visibility = () => {
			if (document.visibilityState === "hidden") void save();
		};
		document.addEventListener("visibilitychange", visibility);
		return () => {
			disposed = true;
			window.clearInterval(timer);
			document.removeEventListener("visibilitychange", visibility);
			player?.destroy();
		};
	}, [videoId]);
	return <div ref={container} className="youtube-mount" />;
}
