interface RobotDrawingProps {
  index: 0 | 1 | 2 | 3;
  on: boolean;
  dimensionLabel: string;
}

function Drawing0({ dimensionLabel }: { dimensionLabel: string }) {
  return (
    <>
      <path d="M60 90 H340 V210 H60 Z" />
      <path d="M80 110 H320 V190 H80 Z" />
      <path d="M60 150 H80 M320 150 H340 M200 90 V110 M200 190 V210" />
      <circle cx="70" cy="100" r="4" />
      <circle cx="330" cy="100" r="4" />
      <circle cx="70" cy="200" r="4" />
      <circle cx="330" cy="200" r="4" />
      <path d="M40 76 H64 V98 H40 Z M336 76 H360 V98 H336 Z M40 202 H64 V224 H40 Z" />
      <path className="dim" d="M60 240 H340 M60 233 V247 M340 233 V247" />
      <text x="170" y="236">{dimensionLabel}</text>
    </>
  );
}

function Drawing1() {
  return (
    <>
      <path d="M70 214 H150 M80 214 V228 M140 214 V228" />
      <circle cx="110" cy="200" r="10" />
      <circle cx="210" cy="120" r="8" />
      <circle cx="300" cy="90" r="6" />
      <path d="M104 193 L204 113 M116 207 L216 127 M215 114 L296 84 M213 127 L304 96" />
      <path d="M300 90 L322 76 M300 90 L324 102" />
      <path className="dim" strokeDasharray="4 5" d="M110 200 A140 140 0 0 1 250 70" />
      <path d="M150 205 L190 150 M146 212 L186 157" />
    </>
  );
}

function Drawing2() {
  return (
    <>
      <path d="M60 80 H130 V130 H60 Z M130 98 H138 V112 H130" />
      <path d="M200 100 H330 V190 H200 Z" />
      <path d="M220 120 H260 V150 H220 Z M280 125 H310 V145 H280 Z" />
      <path d="M215 100 V92 M235 100 V92 M255 100 V92 M275 100 V92 M295 100 V92 M315 100 V92" />
      <path d="M138 105 H170 V120 H200" />
      <path d="M60 105 H44 V220 H250 V190" />
      <path d="M330 120 H350 V70 H100 V80" />
      <circle cx="170" cy="120" r="3" />
      <circle cx="250" cy="220" r="3" />
      <circle cx="350" cy="70" r="3" />
    </>
  );
}

function Drawing3() {
  return (
    <>
      <path d="M60 70 H340 V220 H60 Z M60 92 H340" />
      <circle cx="74" cy="81" r="3" />
      <circle cx="88" cy="81" r="3" />
      <circle cx="102" cy="81" r="3" />
      <path d="M84 112 H150 M84 130 H200 M104 148 H260 M104 166 H180 M84 184 H230 M84 202 H124" />
      <path d="M296 112 q-12 0 -12 12 v10 q0 8 -8 8 q8 0 8 8 v10 q0 12 12 12" />
      <circle className="fillc" cx="72" cy="148" r="5" />
    </>
  );
}

const DRAWINGS = [Drawing0, Drawing1, Drawing2, Drawing3] as const;

export function RobotDrawing({ index, on, dimensionLabel }: RobotDrawingProps) {
  const Inner = DRAWINGS[index];
  return (
    <svg
      className={on ? "dr on" : "dr"}
      data-n={index}
      viewBox="0 0 400 300"
      aria-hidden="true"
      focusable="false"
    >
      <Inner dimensionLabel={dimensionLabel} />
    </svg>
  );
}
