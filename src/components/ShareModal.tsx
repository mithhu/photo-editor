import React, { useState, useEffect, useCallback } from 'react'
import {
  copyImageToClipboard,
  shareNative,
  supportsNativeShare,
  openTwitterShare,
  openFacebookShare,
  openWhatsAppShare,
} from '../utils/shareUtils'

function TwitterIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function FacebookIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  )
}

function WhatsAppIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function InstagramIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function ClipboardIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function ShareIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function CheckIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

interface ShareModalProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  onClose: () => void
  onBeforeAfter?: () => void
}

export function ShareModal({ canvasRef, onClose, onBeforeAfter }: ShareModalProps) {
  const [copied, setCopied] = useState<boolean>(false)
  const [instaCopied, setInstaCopied] = useState<boolean>(false)
  const [twitterCopied, setTwitterCopied] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const hasNativeShare = supportsNativeShare()

  const handleClose = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    window.addEventListener('keydown', handleClose)
    return () => window.removeEventListener('keydown', handleClose)
  }, [handleClose])

  const handleCopy = async (): Promise<void> => {
    try {
      setError(null)
      await copyImageToClipboard(canvasRef.current!)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy image')
    }
  }

  const handleNativeShare = async (): Promise<void> => {
    try {
      setError(null)
      await shareNative(canvasRef.current!)
      onClose()
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name !== 'AbortError') setError('Sharing failed')
    }
  }

  const handleTwitter = async (): Promise<void> => {
    try {
      await copyImageToClipboard(canvasRef.current!)
      setTwitterCopied(true)
      setTimeout(() => setTwitterCopied(false), 5000)
    } catch { /* best effort */ }
    openTwitterShare()
  }

  const handleFacebook = (): void => {
    openFacebookShare()
  }

  const handleWhatsApp = async (): Promise<void> => {
    if (hasNativeShare) {
      try {
        await shareNative(canvasRef.current!)
        onClose()
        return
      } catch { /* fall through to URL */ }
    }
    openWhatsAppShare()
  }

  const handleInstagram = async (): Promise<void> => {
    try {
      setError(null)
      await copyImageToClipboard(canvasRef.current!)
      setInstaCopied(true)
      setTimeout(() => setInstaCopied(false), 4000)
    } catch {
      setError('Could not copy image')
    }
  }

  const btnClass = 'flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-left'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-zinc-100">Share</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="mx-5 mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        {onBeforeAfter && (
          <div className="px-3 pb-2">
            <button
              onClick={onBeforeAfter}
              className={`${btnClass} bg-gradient-to-r from-purple-600/20 to-pink-600/20 hover:from-purple-600/30 hover:to-pink-600/30 text-purple-300 border border-purple-500/30 rounded-lg`}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
                <path d="M7 8l-2 0M7 12l-2 0M7 16l-2 0" />
                <path d="M17 8l2 0M17 12l2 0M17 16l2 0" />
              </svg>
              <div className="flex flex-col">
                <span className="font-medium">Before / After Card</span>
                <span className="text-xs text-purple-400/70">Create a branded comparison image</span>
              </div>
            </button>
          </div>
        )}

        <div className="px-3 pb-3 flex flex-col gap-1">
          {hasNativeShare && (
            <button onClick={handleNativeShare} className={`${btnClass} bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400`}>
              <ShareIcon />
              <span className="font-medium">Share...</span>
            </button>
          )}

          <button onClick={handleCopy} className={`${btnClass} ${copied ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
            {copied ? <CheckIcon /> : <ClipboardIcon />}
            <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
          </button>
        </div>

        <div className="mx-5 border-t border-zinc-700/60" />

        <div className="px-3 py-3 flex flex-col gap-1">
          <button onClick={handleTwitter} className={`${btnClass} ${twitterCopied ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
            <TwitterIcon />
            <div className="flex flex-col">
              <span>{twitterCopied ? 'Image copied! Paste in tweet with Cmd+V' : 'Twitter / X'}</span>
              {!twitterCopied && <span className="text-xs text-zinc-500">Copies image, then opens Twitter</span>}
            </div>
          </button>

          <button onClick={handleFacebook} className={`${btnClass} bg-zinc-800 hover:bg-zinc-700 text-zinc-200`}>
            <FacebookIcon />
            <span>Facebook</span>
          </button>

          <button onClick={handleWhatsApp} className={`${btnClass} bg-zinc-800 hover:bg-zinc-700 text-zinc-200`}>
            <WhatsAppIcon />
            <span>WhatsApp</span>
          </button>

          <button onClick={handleInstagram} className={`${btnClass} ${instaCopied ? 'bg-green-500/10 text-green-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'}`}>
            <InstagramIcon />
            <div className="flex flex-col">
              <span>{instaCopied ? 'Image copied! Open Instagram to paste' : 'Instagram'}</span>
              {!instaCopied && <span className="text-xs text-zinc-500">Copies image to clipboard</span>}
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
