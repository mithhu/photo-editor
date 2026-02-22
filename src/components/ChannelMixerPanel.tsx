import type { EditState, ChannelMixer, ChannelMixerChannel } from '../types'

type ChannelKey = keyof ChannelMixer
type SourceKey = keyof ChannelMixerChannel

const CHANNELS: ChannelKey[] = ['red', 'green', 'blue']
const LABELS: Record<SourceKey, string> = { r: 'Red', g: 'Green', b: 'Blue' }

interface ChannelMixerPanelProps {
  editState: EditState
  applyChange: (updater: ((prev: EditState) => EditState) | Partial<EditState>) => void
}

export function ChannelMixerPanel({ editState, applyChange }: ChannelMixerPanelProps) {
  const cm: ChannelMixer = editState.channelMixer || {
    red: { r: 100, g: 0, b: 0 },
    green: { r: 0, g: 100, b: 0 },
    blue: { r: 0, g: 0, b: 100 },
  }

  const update = (channel: ChannelKey, source: SourceKey, value: number): void => {
    applyChange({
      channelMixer: {
        ...cm,
        [channel]: { ...cm[channel], [source]: value },
      },
    })
  }

  const reset = (): void => {
    applyChange({
      channelMixer: {
        red: { r: 100, g: 0, b: 0 },
        green: { r: 0, g: 100, b: 0 },
        blue: { r: 0, g: 0, b: 100 },
      },
    })
  }

  return (
    <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
      <h3 className="text-sm font-semibold text-zinc-300 mb-3">Channel Mixer</h3>
      <div className="space-y-4">
        {CHANNELS.map((ch) => (
          <div key={ch}>
            <p
              className="text-[10px] font-medium uppercase mb-1.5"
              style={{ color: ch === 'red' ? '#f87171' : ch === 'green' ? '#4ade80' : '#60a5fa' }}
            >
              {ch} output
            </p>
            <div className="space-y-1">
              {(['r', 'g', 'b'] as SourceKey[]).map((src) => (
                <label key={src} className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-8 shrink-0">{LABELS[src]}</span>
                  <input
                    type="range"
                    min="-100"
                    max="200"
                    value={cm[ch]?.[src] ?? (src === ch[0] ? 100 : 0)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => update(ch, src, Number(e.target.value))}
                    className="flex-1 accent-indigo-500 h-1"
                  />
                  <span className="text-[10px] text-zinc-500 w-8 text-right font-mono">
                    {cm[ch]?.[src] ?? (src === ch[0] ? 100 : 0)}%
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <button
          onClick={reset}
          className="w-full py-1.5 text-xs text-zinc-500 hover:text-zinc-300 bg-zinc-800/60 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
