// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "CasalDomain",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "CasalDomain", targets: ["CasalDomain"])
    ],
    targets: [
        .target(name: "CasalDomain"),
        .testTarget(name: "CasalDomainTests", dependencies: ["CasalDomain"])
    ]
)
