// src/components/instruction-input.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Sparkles } from "lucide-react";
import {
  useSimulationActions,
  useSimulationState,
} from "@/context/SimulationContext";

interface InstructionInputProps {
  onInstructionsSubmit: (instr: string[]) => void;
  onReset: () => void;
  isRunning: boolean;
}

const HEX_REGEX = /^[0-9a-fA-F]{8}$/;

export function InstructionInput({
  onInstructionsSubmit,
  onReset,
  isRunning,
}: InstructionInputProps) {
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { pauseSimulation, resumeSimulation } = useSimulationActions();
  const { currentCycle, isFinished, instructions } = useSimulationState();

  /* -------- efectos -------- */
  useEffect(() => {
    if (instructions.length === 0) {
      setInputText("");
      setError(null);
    }
  }, [instructions]);

  /* -------- helpers -------- */
  const hasStarted = currentCycle > 0;
  const canPauseResume = hasStarted && !isFinished;
  const disableInputAndStart = hasStarted && !isFinished;

  const submit = () => {
    setError(null);
    const lines = inputText.trim().split("\n");
    const instr = lines.map((l) => l.trim()).filter(Boolean);

    if (instr.length === 0)
      return setError("Enter at least one instruction (8-hex chars).");

    const invalid = instr.filter((h) => !HEX_REGEX.test(h));
    if (invalid.length)
      return setError(
        `Invalid hex: ${invalid.join(", ")} (must be 8 hex digits).`
      );

    onInstructionsSubmit(instr);
  };

  const toggleRun = () => (isRunning ? pauseSimulation() : resumeSimulation());

  /* -------- UI -------- */
  return (
    <Card className="w-full max-w-lg backdrop-blur-md bg-white/10 border-white/20 shadow-xl">
      <CardHeader className="border-b border-white/20">
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
          MIPS Instructions
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5 p-6">
        <div className="grid gap-1.5">
          <Label
            htmlFor="instructions"
            className="text-slate-200 tracking-wide"
          >
            Ingresar instrucciones{" "}
            <span className="italic">(hex por línea)</span>
          </Label>

          <Textarea
            id="instructions"
            placeholder="8d280000\n010b5020"
            rows={6}
            disabled={disableInputAndStart}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="font-mono resize-none bg-white/10 border-white/20 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-amber-400"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        {/* botones */}
        <div className="flex gap-3">
          {/* start */}
          <Button
            onClick={submit}
            disabled={disableInputAndStart}
            className="flex-1 bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-400 hover:to-pink-400 text-white shadow-lg shadow-amber-500/20 disabled:opacity-30"
          >
            {isFinished
              ? "Finished"
              : hasStarted
              ? "Running..."
              : "Start Simulation"}
          </Button>

          {/* pause / run */}
          {canPauseResume && (
            <Button
              variant="secondary"
              size="icon"
              onClick={toggleRun}
              className="backdrop-blur bg-white/10 border-white/20 hover:bg-white/20"
              aria-label={isRunning ? "Pause" : "Resume"}
            >
              {isRunning ? <Pause /> : <Play />}
            </Button>
          )}

          {/* reset */}
          {hasStarted && (
            <Button
              variant="destructive"
              size="icon"
              onClick={onReset}
              aria-label="Reset"
            >
              <RotateCcw />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
