from types import SimpleNamespace

import pytest

from services.identifier import extract_response_text


def test_skips_thinking_blocks():
    blocks = [
        SimpleNamespace(type="thinking", thinking="reasoning..."),
        SimpleNamespace(type="text", text='{"a": 1}'),
    ]
    assert extract_response_text(blocks) == '{"a": 1}'


def test_text_block_only():
    blocks = [SimpleNamespace(type="text", text='{"a": 1}')]
    assert extract_response_text(blocks) == '{"a": 1}'


def test_concatenates_multiple_text_blocks():
    blocks = [SimpleNamespace(type="text", text="part1"), SimpleNamespace(type="text", text="part2")]
    assert extract_response_text(blocks) == "part1part2"


def test_raises_when_no_text_block_present():
    blocks = [SimpleNamespace(type="thinking", thinking="reasoning only, no answer")]
    with pytest.raises(ValueError):
        extract_response_text(blocks)


def test_raises_on_empty_content():
    with pytest.raises(ValueError):
        extract_response_text([])
