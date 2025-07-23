# MTG JSON Splitter
import json

def split_json(filename):
	with open(filename, "r", encoding="utf-8") as f:
		data = json.load(f)
	return data[:10]