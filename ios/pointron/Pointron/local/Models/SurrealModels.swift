struct CurrentSessionSurrealResult: Decodable {
  var time: String
  var status: String
  var result: CurrentSession?
}
struct TargetsSurrealResult: Decodable {
  var time: String
  var status: String
  var result: [TargetWidgetModel]?
}
