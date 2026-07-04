// ============================================================================
// GankMeDaddy — Voice Output
// Priority-based TTS queue using local Piper TTS (Jenny-Dioco UK Female)
// and robust fallback to standard Windows OneCore Speech.
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec, spawn } from 'child_process';
import { CoachingRecommendation, RecommendationPriority } from '../coaching/types';

interface QueueEntry {
  text: string;
  priority: RecommendationPriority;
  timestamp: number;
}

const PRIORITY_ORDER: Record<RecommendationPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export class VoiceOutput {
  private enabled: boolean;
  private rate: number;
  private queue: QueueEntry[] = [];
  private speaking: boolean = false;
  private cooldowns: Map<string, number> = new Map(); // key → expiry timestamp
  private activeProcess: any = null;

  // Piper paths
  private readonly piperExe = 'D:\\GankMeDaddy\\bin\\piper\\piper.exe';
  private readonly piperModel = 'D:\\GankMeDaddy\\bin\\piper\\en_GB-jenny_dioco-medium.onnx';

  constructor(enabled: boolean = true, rate: number = 1.0) {
    this.enabled = enabled;
    this.rate = rate === 1.0 ? 1.0 : rate;
  }

  /**
   * Enable or disable voice output.
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.queue = [];
      this.stopActivePlayback();
    }
  }

  /**
   * Set speech rate (0.5 to 2.0).
   */
  setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(2.0, rate));
  }

  /**
   * Queue a coaching recommendation for speaking.
   * Respects cooldown deduplication.
   */
  queueRecommendation(rec: CoachingRecommendation): void {
    if (!this.enabled) return;

    // Check cooldown
    const now = Date.now();
    const cooldownExpiry = this.cooldowns.get(rec.cooldownKey);
    if (cooldownExpiry && now < cooldownExpiry) {
      return; // Still in cooldown, skip
    }

    // Set cooldown
    this.cooldowns.set(rec.cooldownKey, now + rec.cooldownSeconds * 1000);

    // Critical messages interrupt the queue
    if (rec.priority === 'critical') {
      this.speakNow(rec.message);
      return;
    }

    // Add to queue in priority order
    this.queue.push({
      text: rec.message,
      priority: rec.priority,
      timestamp: now,
    });

    // Sort queue by priority
    this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    // Cap queue size to prevent buildup
    if (this.queue.length > 10) {
      this.queue = this.queue.slice(0, 10);
    }

    // Start draining if not already speaking
    if (!this.speaking) {
      this.drainQueue();
    }
  }

  /**
   * Immediately speak a critical message, interrupting any current speech.
   */
  speakNow(text: string): void {
    if (!this.enabled) return;

    this.stopActivePlayback();

    this.speaking = true;
    console.log(`[VOICE] 🔊 (Critical) ${text}`);

    this.playSpeech(text, () => {
      this.speaking = false;
      this.drainQueue();
    });
  }

  /**
   * Speak a test message to verify TTS is working.
   */
  test(): void {
    console.log('[VOICE] 🔊 Gank me daddy is online. Ready to coach your mid lane.');
    this.playSpeech('Gank me daddy is online. Ready to coach your mid lane.', () => {});
  }

  /**
   * Clean up expired cooldowns periodically.
   */
  cleanupCooldowns(): void {
    const now = Date.now();
    for (const [key, expiry] of this.cooldowns.entries()) {
      if (now >= expiry) {
        this.cooldowns.delete(key);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private stopActivePlayback(): void {
    if (this.activeProcess) {
      try {
        this.activeProcess.kill();
      } catch (e) {}
      this.activeProcess = null;
    }
  }

  private drainQueue(): void {
    if (!this.enabled || this.speaking || this.queue.length === 0) return;

    const entry = this.queue.shift()!;

    // Skip stale messages (older than 15 seconds)
    if (Date.now() - entry.timestamp > 15000) {
      this.drainQueue();
      return;
    }

    this.speaking = true;
    console.log(`[VOICE] 🔊 ${entry.text}`);

    this.playSpeech(entry.text, () => {
      this.speaking = false;
      // Small gap between messages
      setTimeout(() => this.drainQueue(), 500);
    });
  }

  private playSpeech(text: string, callback: () => void): void {
    // Determine if Piper is installed
    const hasPiper = fs.existsSync(this.piperExe) && fs.existsSync(this.piperModel);

    if (hasPiper) {
      this.playPiperSpeech(text, callback);
    } else {
      this.playFallbackSpeech(text, callback);
    }
  }

  /**
   * Play speech using the high-quality Piper neural engine offline.
   */
  private playPiperSpeech(text: string, callback: () => void): void {
    const tempWav = path.join(os.tmpdir(), `gankmedaddy_${Date.now()}.wav`);
    const lengthScale = (1.15 / this.rate).toFixed(2);

    try {
      // 1. Run piper.exe to generate the high-quality WAV
      const piper = spawn(this.piperExe, [
        '--model', this.piperModel,
        '--output_file', tempWav,
        '--length_scale', lengthScale
      ]);

      this.activeProcess = piper;

      piper.stdin.write(text);
      piper.stdin.end();

      piper.on('close', (code) => {
        if (code !== 0) {
          console.error(`[VOICE] Piper process exited with code ${code}`);
          try { fs.unlinkSync(tempWav); } catch (e) {}
          // Gracefully fall back to standard TTS on failure
          this.playFallbackSpeech(text, callback);
          return;
        }

        // 2. Play the generated WAV file via SoundPlayer
        const player = exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$player = New-Object System.Media.SoundPlayer '${tempWav}'; $player.PlaySync()"`, (err) => {
          if (this.activeProcess === player) {
            this.activeProcess = null;
          }
          // Cleanup WAV
          try { fs.unlinkSync(tempWav); } catch (e) {}
          callback();
        });

        this.activeProcess = player;
      });

      piper.on('error', (err) => {
        console.error('[VOICE] Failed to start Piper process:', err.message);
        try { fs.unlinkSync(tempWav); } catch (e) {}
        this.playFallbackSpeech(text, callback);
      });

    } catch (err) {
      console.error('[VOICE] Piper speech generation error:', err);
      try { fs.unlinkSync(tempWav); } catch (e) {}
      this.playFallbackSpeech(text, callback);
    }
  }

  /**
   * Fallback speech using standard Windows OneCore Speech.
   */
  private playFallbackSpeech(text: string, callback: () => void): void {
    try {
      const psScript = `
[void][Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType=WindowsRuntime]
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.IO
$taskMethods = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 }
$asTaskGeneric = ($taskMethods | Where-Object { $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($WinRtTask, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    return $netTask.Result
}
$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer

# Search for any installed English natural or default female voice
$voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*Sonia*" } | Select-Object -First 1
if (-not $voice) {
    $voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*Natural*" -and $_.Gender -eq 1 } | Select-Object -First 1
}
if (-not $voice) {
    $voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -like "*Zira*" } | Select-Object -First 1
}

if ($voice) {
    $synth.Voice = $voice
}

$text = $args[0]
if ($voice.DisplayName -notlike "*Natural*" -and $voice.DisplayName -notlike "*Sonia*") {
    $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'><prosody pitch='-1.5st' rate='1.18'>$text</prosody></speak>"
    $winrtStream = Await ($synth.SynthesizeSsmlToStreamAsync($ssml)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
} else {
    $winrtStream = Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
}

$stream = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($winrtStream)
$player = New-Object System.Media.SoundPlayer $stream
$player.PlaySync()
`;

      const tempPsFile = path.join(os.tmpdir(), `gankmedaddy_${Date.now()}.ps1`);
      fs.writeFileSync(tempPsFile, psScript, 'utf8');

      const escapedText = text.replace(/"/g, '\\"');

      const proc = exec(`powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${tempPsFile}" "${escapedText}"`, (err) => {
        if (this.activeProcess === proc) {
          this.activeProcess = null;
        }
        try { fs.unlinkSync(tempPsFile); } catch (e) {}
        callback();
      });
      this.activeProcess = proc;
    } catch (err) {
      console.error('[VOICE] Fallback speech failed:', err);
      callback();
    }
  }
}
