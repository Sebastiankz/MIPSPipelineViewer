"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useSimulationState } from "@/context/SimulationContext";
import {
  ChevronRight,
  AlertTriangle,
  Info,
  Lock,
  Play,
  Pause,
} from "lucide-react";

// Detección de hazards
function hasDataHazard(prevHex: string, currHex: string): boolean {
  const dec = (hex: string) => {
    const inst = parseInt(hex, 16);
    const op = (inst >>> 26) & 0x3f;
    if (op === 0x00)
      return {
        type: "R" as const,
        rs: (inst >>> 21) & 0x1f,
        rt: (inst >>> 16) & 0x1f,
        rd: (inst >>> 11) & 0x1f,
      };
    return {
      type: "I" as const,
      op,
      rs: (inst >>> 21) & 0x1f,
      rt: (inst >>> 16) & 0x1f,
    };
  };

  const p = dec(prevHex);
  const c = dec(currHex);

  let dst: number | null = null;
  if (p.type === "R") dst = p.rd;
  else if (p.op === 0x23) dst = p.rt; // lw
  else if (p.op !== 0x2b) dst = p.rt; // I salvo sw

  const src: number[] = [];
  if (c.type === "R") src.push(c.rs, c.rt);
  else if (c.op === 0x23) src.push(c.rs); // lw
  else if (c.op === 0x2b) src.push(c.rs, c.rt); // sw
  else src.push(c.rs);

  return dst !== null && src.includes(dst);
}

// Colores modernos para las etapas (con gradiente)
const STAGE_COLORS = {
  IF: "from-blue-500 to-blue-600",
  ID: "from-indigo-500 to-indigo-600",
  EX: "from-purple-500 to-purple-600",
  MEM: "from-pink-500 to-pink-600",
  WB: "from-red-500 to-red-600",
};

// Paleta de colores vibrantes para instrucciones
const INSTRUCTION_COLORS = [
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-purple-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-cyan-400 to-blue-500",
  "from-lime-400 to-green-500",
];

const colorFor = (i: number) =>
  INSTRUCTION_COLORS[i % INSTRUCTION_COLORS.length];

// Nombres de etapas y sus descripciones para el modo educativo
const STAGE_NAMES = ["IF", "ID", "EX", "MEM", "WB"] as const;
const STAGE_INFO = {
  IF: {
    name: "Instruction Fetch",
    description: "Carga la instrucción desde la memoria al procesador.",
  },
  ID: {
    name: "Instruction Decode",
    description: "Decodifica la instrucción y lee los registros fuente.",
  },
  EX: {
    name: "Execute",
    description:
      "Realiza operaciones ALU o cálculos de direcciones de memoria.",
  },
  MEM: {
    name: "Memory Access",
    description: "Lee o escribe datos en la memoria si es necesario.",
  },
  WB: {
    name: "Write Back",
    description: "Escribe los resultados en los registros destino.",
  },
};

type HazardInfo = {
  type: "RAW" | "WAW" | "WAR" | "Structural" | "Control";
  description: string;
};

export function PipelineVisualization() {
  const {
    instructions,
    currentCycle: cycle,
    maxCycles,
    isRunning,
    instructionStages,
    isFinished,
    mode,
  } = useSimulationState();

  const [view, setView] = useState<"classic" | "modern" | "educational">(
    "modern"
  );
  const [showTooltips, setShowTooltips] = useState(true);
  const [highlightHazards, setHighlightHazards] = useState(true);
  const [selectedStage, setSelectedStage] = useState<
    (typeof STAGE_NAMES)[number] | null
  >(null);

  const totalCycles = Math.max(maxCycles, 0);
  const cycles = Array.from({ length: totalCycles }, (_, i) => i + 1);
  const progress = Math.floor((cycle / totalCycles) * 100);

  // Detección avanzada de hazards
  const hazards = instructions
    .map((inst, i): { index: number; hazard: HazardInfo } | null => {
      if (i === 0 || !isRunning) return null;

      if (
        mode === "stall" &&
        instructionStages[i] === 1 && // curr en ID
        instructionStages[i - 1] === 2
      ) {
        // prev en EX
        if (hasDataHazard(instructions[i - 1], instructions[i])) {
          return {
            index: i,
            hazard: {
              type: "RAW",
              description:
                "Hazard de tipo Read-After-Write: una instrucción intenta leer un dato antes de que la instrucción anterior lo haya escrito.",
            },
          };
        }
      }

      return null;
    })
    .filter(Boolean) as { index: number; hazard: HazardInfo }[];

  const hazardDetected = hazards.length > 0;

  // Effectos de animación para destacar hazards
  useEffect(() => {
    if (hazardDetected && !isFinished) {
      // Potencialmente añadir notificaciones o sonidos educativos
    }
  }, [hazardDetected, cycle, isFinished]);

  // Renderizado de celda según el modo de visualización
  const renderCell = (instIndex: number, cycleNum: number) => {
    const expected = cycleNum - instIndex - 1;
    const currStage = instructionStages[instIndex];
    const inPipe = expected >= 0 && expected < STAGE_NAMES.length;
    const stageName = inPipe ? STAGE_NAMES[expected] : null;
    const stageKey = stageName as keyof typeof STAGE_INFO | null;

    const isCurrent =
      currStage !== null && expected === currStage && cycleNum === cycle;
    const hazardInfo = hazards.find((h) => h.index === instIndex);
    const stalled = hazardInfo && currStage === 1 && cycleNum >= cycle;

    const animate = isCurrent && isRunning && !isFinished;
    const highlight = isCurrent && !isRunning && !isFinished;
    const past = inPipe && cycleNum < cycle;

    // Celda básica para modo clásico
    if (view === "classic") {
      return (
        <TableCell
          key={`c${cycleNum}-i${instIndex}`}
          className={cn(
            "text-center w-16 h-14 transition-colors duration-300",
            isFinished
              ? "bg-background"
              : stalled
              ? "bg-yellow-200 text-yellow-900 font-bold"
              : animate || highlight
              ? `bg-gradient-to-br ${colorFor(instIndex)} text-white`
              : past
              ? "bg-secondary text-secondary-foreground"
              : "bg-background"
          )}
        >
          {stageName && !isFinished && (
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "w-3 h-3 rounded-full mb-1",
                  `bg-gradient-to-r ${colorFor(instIndex)}`,
                  animate ? "animate-ping" : ""
                )}
              />
              <span className="text-xs font-bold">{stageName}</span>
            </div>
          )}
          {stalled && <span className="text-xs font-bold">STALL</span>}
        </TableCell>
      );
    }

    // Celda moderna con efectos visuales mejorados
    if (view === "modern") {
      return (
        <TableCell
          key={`c${cycleNum}-i${instIndex}`}
          className={cn(
            "p-0 transition-all duration-300 overflow-hidden",
            isFinished ? "bg-background" : ""
          )}
        >
          {stageName && !isFinished ? (
            <div
              className={cn(
                "w-full h-14 flex items-center justify-center transition-all",
                stalled
                  ? "bg-gradient-to-r from-yellow-300 to-amber-400"
                  : `bg-gradient-to-r ${
                      stageKey ? STAGE_COLORS[stageKey] : ""
                    } ${past ? "opacity-60" : ""}`,
                animate ? "shadow-lg scale-110 z-10" : "",
                highlight ? "ring-2 ring-offset-2 ring-white" : "",
                selectedStage === stageName
                  ? "ring-2 ring-offset-1 ring-blue-400"
                  : ""
              )}
            >
              <div className="flex flex-col items-center gap-1">
                {stalled ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-700" />
                    <span className="text-xs font-bold text-red-900">
                      STALL
                    </span>
                  </>
                ) : (
                  <>
                    <span
                      className={cn(
                        "text-xs font-bold text-white",
                        animate ? "animate-pulse" : ""
                      )}
                    >
                      {stageName}
                    </span>
                    {animate && (
                      <span className="w-5 h-1 bg-white rounded-full animate-pulse"></span>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </TableCell>
      );
    }

    // Celda educativa con información detallada
    if (view === "educational") {
      return (
        <TableCell
          key={`c${cycleNum}-i${instIndex}`}
          className="p-0 transition-all duration-300"
        >
          {stageName && !isFinished ? (
            <TooltipProvider>
              <Tooltip delayDuration={showTooltips ? 300 : 9999999}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "w-full h-14 flex items-center justify-center transition-all",
                      stalled
                        ? "bg-gradient-to-r from-yellow-300 to-amber-400 cursor-help"
                        : `bg-gradient-to-r ${
                            stageKey ? STAGE_COLORS[stageKey] : ""
                          } ${past ? "opacity-60" : ""} cursor-help`,
                      animate ? "shadow-lg" : "",
                      highlight ? "ring-2 ring-offset-2 ring-white" : ""
                    )}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {stalled ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-700" />
                          <span className="text-xs font-bold text-red-900">
                            STALL
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            className={cn(
                              "text-xs font-bold text-white",
                              animate ? "animate-pulse" : ""
                            )}
                          >
                            {stageName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs bg-slate-900 text-white border-slate-700"
                >
                  {stalled ? (
                    <div className="space-y-2">
                      <div className="font-bold text-red-400 flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4" />
                        Hazard Detectado: {hazardInfo?.hazard.type}
                      </div>
                      <p className="text-xs">
                        {hazardInfo?.hazard.description}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="font-bold">
                        {stageKey ? STAGE_INFO[stageKey].name : stageName}
                      </div>
                      <p className="text-xs">
                        {stageKey ? STAGE_INFO[stageKey].description : ""}
                      </p>
                    </div>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </TableCell>
      );
    }

    return null;
  };

  return (
    <Card className="w-full overflow-hidden border-0 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800">
      <CardHeader className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-2xl">
              Pipeline Visualizer
            </CardTitle>
            <CardDescription className="text-slate-400">
              MIPS Pipeline Execution - Cycle {cycle}/{totalCycles}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {hazardDetected && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Hazard Detected
              </Badge>
            )}
            <Badge
              variant={isRunning ? "default" : "outline"}
              className="flex items-center gap-1"
            >
              {isRunning ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Running
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  Paused
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="p-4 bg-slate-800">
          <Tabs
            defaultValue="modern"
            onValueChange={(value) => setView(value as any)}
          >
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-slate-700">
                <TabsTrigger value="classic">Classic</TabsTrigger>
                <TabsTrigger value="modern">Modern</TabsTrigger>
                <TabsTrigger value="educational">Educational</TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {view === "educational" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTooltips(!showTooltips)}
                    className={cn(
                      "border-slate-600",
                      showTooltips
                        ? "bg-slate-700 text-white"
                        : "bg-transparent text-slate-400"
                    )}
                  >
                    <Info className="h-4 w-4 mr-1" /> Info Tooltips
                  </Button>
                )}
                {highlightHazards ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHighlightHazards(false)}
                    className="bg-slate-700 text-white border-slate-600"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" /> Highlight Hazards
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHighlightHazards(true)}
                    className="bg-transparent text-slate-400 border-slate-600"
                  >
                    <AlertTriangle className="h-4 w-4 mr-1" /> Highlight Hazards
                  </Button>
                )}
              </div>
            </div>

            {/* Información de etapas (solo en modo educativo) */}
            {view === "educational" && (
              <div className="mb-4 grid grid-cols-5 gap-2">
                {Object.entries(STAGE_INFO).map(([key, info]) => (
                  <Card
                    key={key}
                    className={cn(
                      "bg-gradient-to-r",
                      STAGE_COLORS[key as keyof typeof STAGE_COLORS],
                      selectedStage === key ? "ring-2 ring-white" : ""
                    )}
                    onClick={() =>
                      setSelectedStage(
                        selectedStage === key
                          ? null
                          : (key as (typeof STAGE_NAMES)[number])
                      )
                    }
                  >
                    <CardContent className="p-2 text-white">
                      <div className="font-bold flex items-center justify-between">
                        {key} <Info className="h-3 w-3" />
                      </div>
                      <div className="text-xs">{info.name}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Alerta de hazard con estilo mejorado */}
            {hazardDetected && highlightHazards && (
              <div className="mb-4 p-4 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-900 rounded-lg shadow-md border-l-4 border-amber-500">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-bold text-amber-900">
                    Hazard detectado en ciclo {cycle}!
                  </h3>
                </div>
                <p className="mt-1 text-sm text-amber-800">
                  {hazards[0]?.hazard.type} hazard entre instrucciones{" "}
                  {hazards[0]?.index} y {hazards[0]?.index - 1}. Ejecución de
                  pipeline retrasada.
                </p>
              </div>
            )}

            {/* Barra de progreso */}
            <div className="mb-4">
              <Progress value={progress} className="h-2 bg-slate-700" />
            </div>

            {/* Visualización principal */}
            <div className="overflow-x-auto">
              <TabsContent value="classic" className="mt-0">
                <Table className="min-w-max">
                  <TableCaption>
                    Visualización clásica de pipeline MIPS
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px] sticky left-0 bg-slate-900 z-10 border-r border-slate-700 text-white">
                        Instrucción
                      </TableHead>
                      {cycles.map((c) => (
                        <TableHead
                          key={c}
                          className="text-center w-16 text-slate-400"
                        >
                          {c}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructions.map((inst, i) => (
                      <TableRow key={inst + i} className="border-slate-700">
                        <TableCell className="font-mono sticky left-0 bg-slate-900 z-10 border-r border-slate-700 text-white">
                          {inst}
                        </TableCell>
                        {cycles.map((c) => renderCell(i, c))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="modern" className="mt-0">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px] sticky left-0 bg-slate-900 z-10 border-r border-slate-700 text-white">
                        <div className="flex items-center justify-between">
                          Instrucción
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        </div>
                      </TableHead>
                      {cycles.map((c) => (
                        <TableHead key={c} className="text-center p-1 w-16">
                          <div
                            className={cn(
                              "rounded text-xs py-1",
                              c === cycle
                                ? "bg-blue-600 text-white font-bold"
                                : "text-slate-400"
                            )}
                          >
                            {c}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructions.map((inst, i) => (
                      <TableRow key={inst + i} className="border-slate-700">
                        <TableCell className="font-mono sticky left-0 bg-slate-900 z-10 border-r border-slate-700 text-white p-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-3 h-8 rounded-sm",
                                `bg-gradient-to-br ${colorFor(i)}`
                              )}
                            />
                            <span className="text-sm tracking-tight">
                              {inst}
                            </span>
                          </div>
                        </TableCell>
                        {cycles.map((c) => renderCell(i, c))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="educational" className="mt-0">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[170px] sticky left-0 bg-slate-900 z-10 border-r border-slate-700 text-white">
                        <div className="flex items-center justify-between">
                          Instrucción
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        </div>
                      </TableHead>
                      {cycles.map((c) => (
                        <TableHead key={c} className="text-center p-1 w-16">
                          <div
                            className={cn(
                              "rounded text-xs py-1",
                              c === cycle
                                ? "bg-blue-600 text-white font-bold"
                                : "text-slate-400"
                            )}
                          >
                            Ciclo {c}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {instructions.map((inst, i) => (
                      <TableRow key={inst + i} className="border-slate-700">
                        <TableCell className="sticky left-0 bg-slate-900 z-10 border-r border-slate-700 text-white p-2">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-start">
                              <span className="font-mono text-sm tracking-tight">
                                {inst}
                              </span>
                              <span className="text-xs text-slate-400">
                                Instrucción #{i + 1}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        {cycles.map((c) => renderCell(i, c))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Leyenda y controles */}
        <div className="p-4 bg-slate-900 border-t border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-400 to-blue-600"></span>
              <span className="text-xs text-slate-400">IF</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600"></span>
              <span className="text-xs text-slate-400">ID</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-400 to-purple-600"></span>
              <span className="text-xs text-slate-400">EX</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-pink-400 to-pink-600"></span>
              <span className="text-xs text-slate-400">MEM</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-red-400 to-red-600"></span>
              <span className="text-xs text-slate-400">WB</span>
            </div>
            {hazardDetected && highlightHazards && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-500">Hazard</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-slate-700 bg-slate-800 text-slate-300"
            >
              {isRunning ? (
                <Pause className="h-3 w-3 mr-1" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              {isRunning ? "Pause" : "Run"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
