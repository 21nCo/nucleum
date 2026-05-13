//
//  Extensions.swift
//  Pointron
//
//  Created by Ar on 10/9/23.
//

import Foundation
import SwiftUI


//extension View {
//    func bgStyle(_ color: Color) -> some View {
//        if #available(iOS 16.0, *) {
//            self.backgroundStyle(color)
//        } else {
//            self.background(color)
//        }
//    }
//}

extension View {
    func customForegroundColor(_ color: Color) -> some View {
        self.foregroundColor(color) // Apply the custom color
    }
}

extension String {
    func toJSON() -> Any? {
        guard let data = self.data(using: .utf8, allowLossyConversion: false) else { return nil }
        return try? JSONSerialization.jsonObject(with: data, options: .mutableContainers)
    }
}


public extension Color {
    init(hex: String) {
        var str = hex
        if str.hasPrefix("#") {
            str.removeFirst()
        }
        let scanner = Scanner(string: str)
        scanner.scanLocation = 0
        var rgbValue: UInt64 = 0
        scanner.scanHexInt64(&rgbValue)
        
        let r = (rgbValue & 0xff0000) >> 16
        let g = (rgbValue & 0xff00) >> 8
        let b = rgbValue & 0xff
        
        self.init(red: Double(r) / 0xff, green: Double(g) / 0xff, blue: Double(b) / 0xff)
    }
}

public extension Color {
    static func hsl(_ hsl: String) -> Color {
        let pattern = #"^hsla?\(\s*([+-]?(?:\d+(?:\.\d+)?|\.\d+))(?:deg)?[\s,]+([+-]?(?:\d+(?:\.\d+)?|\.\d+))%[\s,]+([+-]?(?:\d+(?:\.\d+)?|\.\d+))%(?:[\s,/]+([+-]?(?:\d+(?:\.\d+)?|\.\d+))(%?)\s*)?\)$"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]),
              let match = regex.firstMatch(in: hsl, range: NSRange(hsl.startIndex..., in: hsl)),
              let hRange = Range(match.range(at: 1), in: hsl),
              let sRange = Range(match.range(at: 2), in: hsl),
              let lRange = Range(match.range(at: 3), in: hsl),
              let rawH = Double(hsl[hRange]),
              let rawS = Double(hsl[sRange]),
              let rawL = Double(hsl[lRange]) else {
            return Color.black // Return black if parsing fails.
        }
        let h = rawH.truncatingRemainder(dividingBy: 360) < 0
            ? rawH.truncatingRemainder(dividingBy: 360) + 360
            : rawH.truncatingRemainder(dividingBy: 360)
        let s = min(max(rawS, 0), 100)
        let l = min(max(rawL, 0), 100)
        let alpha: Double
        if match.range(at: 4).location != NSNotFound,
           let alphaRange = Range(match.range(at: 4), in: hsl),
           let rawAlpha = Double(hsl[alphaRange]) {
            let alphaIsPercent = match.range(at: 5).location != NSNotFound && match.range(at: 5).length > 0
            alpha = alphaIsPercent ? min(max(rawAlpha / 100, 0), 1) : min(max(rawAlpha, 0), 1)
        } else {
            alpha = 1
        }

        // Convert HSL to RGB using the formula.
        let c = (1.0 - abs(2.0 * l / 100.0 - 1.0)) * s / 100.0
        let x = c * (1.0 - abs(fmod(h / 60.0, 2.0) - 1.0))
        let m = l / 100.0 - c / 2.0
        var r: Double = 0, g: Double = 0, b: Double = 0

        switch h {
        case 0..<60:
            r = c; g = x; b = 0
        case 60..<120:
            r = x; g = c; b = 0
        case 120..<180:
            r = 0; g = c; b = x
        case 180..<240:
            r = 0; g = x; b = c
        case 240..<300:
            r = x; g = 0; b = c
        case 300..<360:
            r = c; g = 0; b = x
        default:
            break
        }

        return Color(red: r + m, green: g + m, blue: b + m, opacity: alpha)
    }
}
