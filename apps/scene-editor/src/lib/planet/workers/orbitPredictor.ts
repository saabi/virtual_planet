import { len3, type Vec3 } from '../math/vec.js';

interface OrbitPredictorRequest {
	freeFlyPosition: Vec3;
	spaceflightVelocity: Vec3;
	spaceflightGravity: number;
	seaLevelRadius: number;
	radius: number;
	predictionHorizonSeconds: number;
	predictionAutoPeriod: boolean;
	requestId: number;
}

self.onmessage = (e: MessageEvent<OrbitPredictorRequest>) => {
	const {
		freeFlyPosition,
		spaceflightVelocity,
		spaceflightGravity,
		seaLevelRadius,
		radius,
		predictionHorizonSeconds,
		predictionAutoPeriod,
		requestId
	} = e.data;

	const dist = len3(freeFlyPosition);
	const mu = spaceflightGravity * seaLevelRadius * seaLevelRadius;

	// Calculate lookahead time T
	let T = predictionHorizonSeconds;
	if (predictionAutoPeriod) {
		const period = 2 * Math.PI * Math.sqrt(Math.pow(dist, 3) / (mu || 1));
		T = Math.min(3600, period); // cap at 1 hour
	}

	// Numerical integration
	const N = 250;
	const dt = T / N;
	let p = [...freeFlyPosition] as Vec3;
	let v = [...spaceflightVelocity] as Vec3;

	const pathPoints: Vec3[] = [[...p]];
	let crashed = false;

	for (let i = 0; i < N; i++) {
		const d = len3(p);
		if (d < radius + 1.0) {
			crashed = true;
			break;
		}
		const gAccMagnitude = mu / (d * d * d || 1);
		const ax = -p[0] * gAccMagnitude;
		const ay = -p[1] * gAccMagnitude;
		const az = -p[2] * gAccMagnitude;

		v = [v[0] + ax * dt, v[1] + ay * dt, v[2] + az * dt];
		p = [p[0] + v[0] * dt, p[1] + v[1] * dt, p[2] + v[2] * dt];
		pathPoints.push([...p]);
	}

	// Detect landmarks (Ap/Pe)
	let pePoint: Vec3 | null = null;
	let apPoint: Vec3 | null = null;

	for (let i = 1; i < pathPoints.length - 1; i++) {
		const dPrev = len3(pathPoints[i - 1]);
		const dCurr = len3(pathPoints[i]);
		const dNext = len3(pathPoints[i + 1]);

		if (dCurr < dPrev && dCurr < dNext) {
			if (dCurr > radius + 1.05) {
				pePoint = pathPoints[i];
			}
		}
		if (dCurr > dPrev && dCurr > dNext) {
			apPoint = pathPoints[i];
		}
	}

	self.postMessage({
		pathPoints,
		crashed,
		pePoint,
		apPoint,
		requestId
	});
};
