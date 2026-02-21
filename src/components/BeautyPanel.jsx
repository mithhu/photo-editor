import { useState, useCallback } from 'react'
import { Slider } from './Slider'
import { MAKEUP_PRESETS } from '../utils/virtualMakeup'

const BEAUTY_SLIDERS = [
  { key: 'smooth', label: 'Skin Smooth', max: 100 },
  { key: 'blemish', label: 'Blemish Fix', max: 100 },
  { key: 'evenness', label: 'Tone Evenness', max: 100 },
  { key: 'brightenEyes', label: 'Brighten Eyes', max: 100 },
  { key: 'teethWhiten', label: 'Teeth Whiten', max: 100 },
]

const RESHAPE_SLIDERS = [
  { key: 'slimFace', label: 'Slim Face', max: 100 },
  { key: 'biggerEyes', label: 'Bigger Eyes', max: 100 },
  { key: 'noseSlim', label: 'Nose Slim', max: 100 },
  { key: 'jawline', label: 'Jawline', max: 100 },
]

const MAKEUP_ITEMS = [
  { key: 'lipstick', label: 'Lipstick' },
  { key: 'blush', label: 'Blush' },
  { key: 'eyeliner', label: 'Eyeliner' },
  { key: 'eyeshadow', label: 'Eye Shadow' },
]

const PRESET_COLORS = [
  '#cc3355', '#e06070', '#d4837c', '#aa1133', '#e88899',
  '#886699', '#663399', '#555555', '#222222', '#000000',
  '#c4a882', '#e0c0b0', '#d4b8cc', '#f0b0b0', '#dd6677',
]

export function BeautyPanel({ beauty, faceReshape, makeup, onUpdate }) {
  const [tab, setTab] = useState('beauty')

  const updateBeauty = useCallback((key, value) => {
    onUpdate({ beauty: { ...beauty, [key]: value } })
  }, [beauty, onUpdate])

  const updateReshape = useCallback((key, value) => {
    onUpdate({ faceReshape: { ...faceReshape, [key]: value } })
  }, [faceReshape, onUpdate])

  const updateMakeup = useCallback((itemKey, field, value) => {
    onUpdate({
      makeup: {
        ...makeup,
        [itemKey]: { ...makeup[itemKey], [field]: value },
      },
    })
  }, [makeup, onUpdate])

  const applyPreset = useCallback((presetKey) => {
    const preset = MAKEUP_PRESETS[presetKey]
    if (preset) onUpdate({ makeup: { ...preset } })
  }, [onUpdate])

  const resetAll = useCallback(() => {
    onUpdate({
      beauty: { smooth: 0, blemish: 0, evenness: 0, brightenEyes: 0, teethWhiten: 0 },
      faceReshape: { slimFace: 0, biggerEyes: 0, noseSlim: 0, jawline: 0 },
      makeup: {
        lipstick: { color: '#cc3355', opacity: 0 },
        blush: { color: '#e88899', opacity: 0 },
        eyeliner: { color: '#222222', opacity: 0 },
        eyeshadow: { color: '#886699', opacity: 0 },
      },
    })
  }, [onUpdate])

  const autoBeauty = useCallback(() => {
    onUpdate({
      beauty: { smooth: 20, blemish: 15, evenness: 12, brightenEyes: 15, teethWhiten: 10 },
      faceReshape: { slimFace: 15, biggerEyes: 10, noseSlim: 5, jawline: 10 },
    })
  }, [onUpdate])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          AI Beauty
        </h3>
        <button
          onClick={resetAll}
          className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-800/50 rounded-lg p-0.5">
        {[
          { id: 'beauty', label: 'Beauty' },
          { id: 'reshape', label: 'Reshape' },
          { id: 'makeup', label: 'Makeup' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1 text-[10px] font-medium rounded-md transition-colors ${
              tab === t.id
                ? 'bg-indigo-500 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Auto Beauty Button — visible on beauty and reshape tabs */}
      {(tab === 'beauty' || tab === 'reshape') && (
        <button
          onClick={autoBeauty}
          className="w-full py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400 transition-all"
        >
          Auto Beauty + Reshape
        </button>
      )}

      {tab === 'beauty' && (
        <div className="space-y-2">
          {BEAUTY_SLIDERS.map(s => (
            <Slider
              key={s.key}
              label={s.label}
              min={0}
              max={s.max}
              step={1}
              unit="%"
              value={beauty[s.key]}
              onChange={v => updateBeauty(s.key, v)}
            />
          ))}
        </div>
      )}

      {/* Reshape */}
      {tab === 'reshape' && (
        <div className="space-y-2">
          {RESHAPE_SLIDERS.map(s => (
            <Slider
              key={s.key}
              label={s.label}
              min={0}
              max={s.max}
              step={1}
              unit="%"
              value={faceReshape[s.key]}
              onChange={v => updateReshape(s.key, v)}
            />
          ))}
        </div>
      )}

      {/* Makeup */}
      {tab === 'makeup' && (
        <div className="space-y-3">
          {/* Presets */}
          <div>
            <span className="text-[10px] text-zinc-400 mb-1 block">Presets</span>
            <div className="flex gap-1 flex-wrap">
              {Object.entries(MAKEUP_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Individual Controls */}
          {MAKEUP_ITEMS.map(item => (
            <div key={item.key} className="space-y-1">
              <Slider
                label={item.label}
                min={0}
                max={100}
                step={1}
                unit="%"
                value={makeup[item.key].opacity}
                onChange={v => updateMakeup(item.key, 'opacity', v)}
              />
              {makeup[item.key].opacity > 0 && (
                <div className="flex gap-1 flex-wrap pl-1">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => updateMakeup(item.key, 'color', c)}
                      className={`w-4 h-4 rounded-full border transition-transform ${
                        makeup[item.key].color === c
                          ? 'border-white scale-125'
                          : 'border-zinc-600 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
