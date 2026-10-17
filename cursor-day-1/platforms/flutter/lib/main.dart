import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

void main() => runApp(const CursorDay1Shell());

class CursorDay1Shell extends StatelessWidget {
  const CursorDay1Shell({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'cursor-day-1',
      theme: ThemeData(colorSchemeSeed: const Color(0xFF2563EB), useMaterial3: true),
      home: Scaffold(
        appBar: AppBar(title: const Text('cursor-day-1 · Flutter')),
        body: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Same design JSON as the web editor — mobile packaging shell.',
                style: TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () => launchUrl(Uri.parse('http://localhost:5173')),
                child: const Text('Open web editor'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
