DEFINE FUNCTION fn::pointron::iOS::currentSessionWidget() {
    let $value = array::first(select value snapshot.widgetSnapshot from PointSession:session);
  return {color: $value.color, isFocusing: $value.isFocusing, isSessionRunning: $value.isSessionRunning, todayFocus: $value.todayFocus / 3600 }
};




DEFINE FUNCTION fn::pointron::iOS::currentSessionWidget() { let $value = array::first(select value snapshot.widgetSnapshot from PointSession:session); return {color: $value.color, isFocusing: $value.isFocusing, isSessionRunning: $value.isSessionRunning, todayFocus: $value.todayFocus / 3600 } };