// src/app/page.tsx
"use client";

import { InstructionInput } from "@/components/instruction-input";
import { PipelineVisualization } from "@/components/pipeline-visualization";
import { Separator } from "@/components/ui/separator";
import {
  useSimulationState,
  useSimulationActions,
} from "@/context/SimulationContext";

import {
  Zap,
  ChevronRight,
  MoveRight,
  ShieldCheck,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Home() {
  /* -------- contexto -------- */
  const { instructions, isRunning, currentCycle, maxCycles, isFinished, mode } =
    useSimulationState();
  const { startSimulation, resetSimulation, setMode } = useSimulationActions();

  const hasStarted = currentCycle > 0;

  /* -------- UI -------- */
  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* hero */}
      <section className="py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight inline-flex items-center gap-2 bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-pink-500 to-purple-500">
          <Zap className="h-8 w-8 animate-pulse" />
          MIPS Pipeline Viewer
        </h1>
        <p className="mt-2 text-slate-300 max-w-xl mx-auto">
          Visualiza paso a paso cómo fluyen las instrucciones a través de un
          pipeline de 5 etapas.
        </p>
      </section>

      {/* modo selector */}
      <section className="flex justify-center">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setMode(mode === "stall" ? "normal" : "stall")}
            className={cn(
              "px-5 py-2 rounded-full border transition-all flex items-center gap-2",
              mode === "stall"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg"
                : "bg-white/10 hover:bg-white/20"
            )}
          >
            {mode === "stall" ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Stall
          </button>

          <button
            onClick={() =>
              setMode(mode === "forwarding" ? "normal" : "forwarding")
            }
            className={cn(
              "px-5 py-2 rounded-full border transition-all flex items-center gap-2",
              mode === "forwarding"
                ? "bg-gradient-to-r from-green-500 to-teal-500 shadow-lg"
                : "bg-white/10 hover:bg-white/20"
            )}
          >
            <MoveRight className="h-4 w-4" />
            Forwarding
          </button>
        </div>
      </section>

      {/* input & visualización */}
      <section className="container mx-auto px-4 py-10 space-y-8">
        <InstructionInput
          onInstructionsSubmit={startSimulation}
          onReset={resetSimulation}
          isRunning={isRunning}
        />

        <Separator className="bg-white/10" />

        {instructions.length > 0 && (
          <>
            <PipelineVisualization />

            {/* footer ciclos */}
            {maxCycles > 0 && (
              <p className="text-center mt-4 text-slate-400">
                Cycle&nbsp;{currentCycle}/{maxCycles}&nbsp;
                {isFinished
                  ? "(Finished)"
                  : isRunning
                  ? "(Running)"
                  : "(Paused)"}
              </p>
            )}
          </>
        )}

        {/* mensajes inicial / reset */}
        {!hasStarted && instructions.length === 0 && (
          <p className="text-center text-slate-400">
            Enter instructions and press <strong>Start Simulation</strong>.
          </p>
        )}
        {hasStarted && instructions.length === 0 && (
          <p className="text-center text-slate-400">
            Simulation reset. Enter new instructions to start again.
          </p>
        )}
      </section>
    </main>
  );
}
