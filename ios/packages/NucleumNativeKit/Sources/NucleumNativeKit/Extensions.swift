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
        var str = hex;
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
        // Remove the 'hsl' and parentheses, then split into components.
        let trimmedString = hsl.trimmingCharacters(in: CharacterSet(charactersIn: "hsl()% "))
        let components = trimmedString.components(separatedBy: " ")
        guard components.count == 3,
              let h = Double(components[0]),
              let s = Double(components[1].trimmingCharacters(in: CharacterSet(charactersIn: "%"))),
              let l = Double(components[2].trimmingCharacters(in: CharacterSet(charactersIn: "%"))) else {
            return Color.black // Return black if parsing fails.
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

        return Color(red: r + m, green: g + m, blue: b + m)
    }
}



extension String {
    func decodeJWT() -> [String: Any]? {
        let segments = self.components(separatedBy: ".")
        guard segments.count > 1 else { return nil }
        
        let base64String = segments[1]
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        
        let padded = base64String.padding(toLength: ((base64String.count + 3) / 4) * 4, 
                                          withPad: "=", 
                                          startingAt: 0)
        
        guard let data = Data(base64Encoded: padded) else { return nil }
        
        return try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
    }
}