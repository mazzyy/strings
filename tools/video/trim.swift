// Cuts a video to its first N seconds without re-encoding (the edit's recorder can run on past
// the end of the sound, holding the end card): swift trim.swift <in.mp4> <out.mp4> <seconds>
import AVFoundation
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let out = URL(fileURLWithPath: a[2])
try? FileManager.default.removeItem(at: out)
guard let ex = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetPassthrough) else { print("no export"); exit(1) }
ex.outputURL = out
ex.outputFileType = .mp4
ex.timeRange = CMTimeRange(start: .zero, duration: CMTime(seconds: Double(a[3])!, preferredTimescale: 600))
let done = DispatchSemaphore(value: 0)
ex.exportAsynchronously { done.signal() }
done.wait()
print(ex.status == .completed ? "trimmed to \(a[3]) s: \(a[2])" : "failed: \(String(describing: ex.error))")
