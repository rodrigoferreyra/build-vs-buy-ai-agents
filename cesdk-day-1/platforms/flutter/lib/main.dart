import 'package:flutter/material.dart';
import 'package:imgly_editor/imgly_editor.dart';

void main() {
  runApp(const CesdkDay1App());
}

class CesdkDay1App extends StatelessWidget {
  const CesdkDay1App({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'cesdk-day-1 Flutter',
      home: Scaffold(
        appBar: AppBar(title: const Text('cesdk-day-1 Flutter')),
        body: Center(
          child: Semantics(
            button: true,
            label: 'Open design editor',
            child: ElevatedButton(
              onPressed: () async {
                await IMGLYEditor.openEditor(
                  settings: EditorSettings(license: const String.fromEnvironment('CESDK_LICENSE')),
                );
              },
              child: const Text('Open design editor'),
            ),
          ),
        ),
      ),
    );
  }
}
