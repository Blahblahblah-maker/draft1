'use client'

import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X } from 'lucide-react'
import { compressImage, toUserDay } from '@/lib/utils'

interface CheckinDialogProps {
  habitId: string
  habitName: string
  timeZone?: string
  children: React.ReactNode
}

export function CheckinDialog({ habitId, habitName, timeZone = 'UTC', children }: CheckinDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const checkinMutation = useMutation({
    mutationFn: async (data: { takenAt: Date; day: string; note?: string; imageBase64?: string }) => {
      const response = await fetch(`/api/habits/${habitId}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create check-in')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] })
      queryClient.invalidateQueries({ queryKey: ['habit', habitId] })
      setIsOpen(false)
      resetForm()
    },
  })

  const resetForm = () => {
    setSelectedFile(null)
    setPreview(null)
    setNote('')
    setIsUploading(false)
  }

  const handleFileSelect = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      alert('File too large. Please select an image under 15MB.')
      return
    }

    setSelectedFile(file)
    
    // Compress image for preview
    try {
      const compressed = await compressImage(file, { maxWidth: 800, quality: 0.7 })
      const previewUrl = URL.createObjectURL(compressed)
      setPreview(previewUrl)
    } catch (error) {
      console.error('Error compressing image:', error)
      // Fallback to original file
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      // Compress image for upload
      const compressed = await compressImage(selectedFile, { maxWidth: 1200, quality: 0.7 })
      
      // Convert to base64 for MVP (in production, upload to Supabase Storage)
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        
        checkinMutation.mutate({
          takenAt: new Date(),
          day: toUserDay(new Date(), timeZone),
          note: note.trim() || undefined,
          imageBase64: base64,
        })
      }
      reader.readAsDataURL(compressed)
    } catch (error) {
      console.error('Error processing image:', error)
      setIsUploading(false)
    }
  }

  const handleCameraClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*'
      fileInputRef.current.capture = 'environment'
      fileInputRef.current.click()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Check in for {habitName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Camera className="h-4 w-4 inline mr-2" />
              Camera
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Upload className="h-4 w-4 inline mr-2" />
              Upload
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
            className="hidden"
          />

          {/* Content */}
          {!preview ? (
            <div className="space-y-4">
              {activeTab === 'camera' ? (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                    <Camera className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Take a photo to prove you completed your habit today
                  </p>
                  <Button onClick={handleCameraClick} className="w-full">
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-32 h-32 mx-auto bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Upload a photo from your gallery
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Photo
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview */}
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setPreview(null)
                  }}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Note input */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Add a note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="How did it go today?"
                  className="w-full p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={200}
                />
                <div className="text-xs text-gray-500 text-right mt-1">
                  {note.length}/200
                </div>
              </div>

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={isUploading || checkinMutation.isPending}
                className="w-full"
              >
                {isUploading || checkinMutation.isPending ? (
                  'Uploading...'
                ) : (
                  'Submit Check-in'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}