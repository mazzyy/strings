// Pulls still frames out of a video (to check a cut by eye) and prints what the file contains.
//   swift frames.swift <video> <outdir> <width> <t1> <t2> ...
import AVFoundation
import AppKit
let a = CommandLine.arguments
let asset = AVURLAsset(url: URL(fileURLWithPath: a[1]))
let dur = CMTimeGetSeconds(asset.duration)
print(String(format: "duration %.2f s", dur))
for t in asset.tracks {
  let d = t.formatDescriptions.first.map { CMFormatDescriptionGetMediaSubType($0 as! CMFormatDescription) } ?? 0
  let fourcc = String(bytes: [UInt8((d >> 24) & 255), UInt8((d >> 16) & 255), UInt8((d >> 8) & 255), UInt8(d & 255)], encoding: .ascii) ?? "?"
  print("track \(t.mediaType.rawValue) \(fourcc) \(Int(t.naturalSize.width))x\(Int(t.naturalSize.height)) \(String(format: "%.1f", t.nominalFrameRate)) fps \(Int(t.estimatedDataRate / 1000)) kbit/s")
}
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = CMTime(seconds: 0.05, preferredTimescale: 600)
gen.requestedTimeToleranceAfter = CMTime(seconds: 0.05, preferredTimescale: 600)
let w = Double(a[3]) ?? 640
gen.maximumSize = CGSize(width: w, height: w)
try? FileManager.default.createDirectory(atPath: a[2], withIntermediateDirectories: true)
var ok = 0
for s in a.dropFirst(4) {
  guard let t = Double(s), t < dur else { continue }
  if let img = try? gen.copyCGImage(at: CMTime(seconds: t, preferredTimescale: 600), actualTime: nil) {
    let rep = NSBitmapImageRep(cgImage: img)
    if let data = rep.representation(using: .jpeg, properties: [.compressionFactor: 0.85]) {
      try? data.write(to: URL(fileURLWithPath: "\(a[2])/f\(String(format: "%05.1f", t)).jpg")); ok += 1
    }
  }
}
print("frames \(ok)")
